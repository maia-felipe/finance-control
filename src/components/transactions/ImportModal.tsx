import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, Transaction, CurrencyCode } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { toast } from '../../lib/toast'
import { formatDate } from '../../utils/formatDate'
import { useMoney } from '../../hooks/useMoney'
import { useSettings } from '../../contexts/SettingsContext'
import { CurrencySelect } from '../ui/CurrencySelect'
import {
  parseCsv, parseOfx, isOfx, guessCsvMapping, mapCsvRows,
} from '../../utils/importParsers'
import type { CsvData, CsvDateFormat, CsvMapping, ParsedTransaction } from '../../utils/importParsers'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  categories: Category[]
  existingTransactions: Transaction[]
  onImport: (rows: Omit<Transaction, 'id'>[]) => void
}

interface PreviewRow extends ParsedTransaction {
  included: boolean
  duplicate: boolean
}

type Step = 'file' | 'map' | 'preview'

function dupKey(date: string, amount: number, description: string): string {
  return `${date}|${amount}|${description.trim().toLowerCase()}`
}

export function ImportModal({ open, onClose, categories, existingTransactions, onImport }: ImportModalProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const { preferredCurrency, trackCurrency } = useSettings()
  // Um extrato bancário vem inteiro numa moeda só — escolhida uma vez, não por linha.
  const [currency, setCurrency] = useState<CurrencyCode>(preferredCurrency)
  const [step, setStep] = useState<Step>('file')
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [mapping, setMapping] = useState<CsvMapping>({ dateCol: 0, amountCol: 1, descCol: 2, dateFormat: 'dd/MM/yyyy', sign: 'auto' })
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [expenseCategoryId, setExpenseCategoryId] = useState('')
  const [incomeCategoryId, setIncomeCategoryId] = useState('')

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')
  const incomeCategories = categories.filter(c => c.type === 'income' || c.type === 'both')

  const reset = () => {
    setStep('file')
    setCsvData(null)
    setRows([])
  }

  const close = () => {
    reset()
    onClose()
  }

  // Marca duplicatas contra as transações existentes e dentro do próprio arquivo
  const toPreview = (parsed: ParsedTransaction[]) => {
    const existing = new Set(existingTransactions.map(t => dupKey(t.date, t.amount, t.description)))
    const seen = new Set<string>()
    const preview: PreviewRow[] = parsed.map(p => {
      const key = p.externalId ?? dupKey(p.date, p.amount, p.description)
      const duplicate = existing.has(dupKey(p.date, p.amount, p.description)) || seen.has(key)
      seen.add(key)
      return { ...p, duplicate, included: !duplicate }
    })
    setRows(preview)
    setStep('preview')
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    if (isOfx(text)) {
      const parsed = parseOfx(text)
      if (parsed.length === 0) {
        toast.error(t('import.noOfxTransactions'))
        return
      }
      toPreview(parsed)
    } else {
      const data = parseCsv(text)
      if (data.rows.length === 0) {
        toast.error('Nenhuma linha de dados encontrada no arquivo CSV.')
        return
      }
      const guessed = guessCsvMapping(data.headers)
      // Heurística para o formato de data a partir da primeira linha
      const sample = data.rows[0]?.[guessed.dateCol] ?? ''
      const dateFormat: CsvDateFormat = /^\d{4}-/.test(sample.trim()) ? 'yyyy-MM-dd' : 'dd/MM/yyyy'
      setMapping(m => ({ ...m, ...guessed, dateFormat }))
      setCsvData(data)
      setStep('map')
    }
  }

  const handleMapContinue = () => {
    if (!csvData) return
    const { parsed, skipped } = mapCsvRows(csvData, mapping)
    if (parsed.length === 0) {
      toast.error(t('import.noValidRows'))
      return
    }
    if (skipped > 0) toast.info(t('import.skipped', { count: skipped }))
    toPreview(parsed)
  }

  const included = rows.filter(r => r.included)
  const hasExpenses = included.some(r => r.type === 'expense')
  const hasIncomes = included.some(r => r.type === 'income')
  const canImport = included.length > 0
    && (!hasExpenses || expenseCategoryId)
    && (!hasIncomes || incomeCategoryId)

  const handleImport = () => {
    trackCurrency(currency)
    onImport(included.map(r => ({
      date: r.date,
      amount: r.amount,
      currency,
      type: r.type,
      categoryId: r.type === 'expense' ? expenseCategoryId : incomeCategoryId,
      description: r.description,
      recurring: false,
    })))
    toast.success(t('import.imported', { count: included.length }))
    close()
  }

  const colOptions = csvData?.headers.map((h, i) => (
    <option key={i} value={i}>{h || t('import.column', { n: i + 1 })}</option>
  ))

  return (
    <Modal open={open} onClose={close} title={t('import.title')}>
      {step === 'file' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-2">{t('import.fileIntro')}</p>
          <input
            type="file"
            accept=".csv,.ofx,.txt"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
            className="text-sm text-content-2 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-accent-soft file:text-accent file:font-medium file:cursor-pointer hover:file:bg-accent/20"
          />
        </div>
      )}

      {step === 'map' && csvData && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-2">{t('import.mappingIntro')}</p>
          <Select label={t('import.dateColumn')} value={mapping.dateCol} onChange={e => setMapping(m => ({ ...m, dateCol: Number(e.target.value) }))}>
            {colOptions}
          </Select>
          <Select label={t('import.amountColumn')} value={mapping.amountCol} onChange={e => setMapping(m => ({ ...m, amountCol: Number(e.target.value) }))}>
            {colOptions}
          </Select>
          <Select label={t('import.descriptionColumn')} value={mapping.descCol} onChange={e => setMapping(m => ({ ...m, descCol: Number(e.target.value) }))}>
            {colOptions}
          </Select>
          <Select label={t('import.dateFormat')} value={mapping.dateFormat} onChange={e => setMapping(m => ({ ...m, dateFormat: e.target.value as CsvDateFormat }))}>
            <option value="dd/MM/yyyy">{t('import.dateFormatDMY')}</option>
            <option value="yyyy-MM-dd">{t('import.dateFormatYMD')}</option>
            <option value="MM/dd/yyyy">{t('import.dateFormatMDY')}</option>
          </Select>
          <Select label={t('import.typeSource')} value={mapping.sign} onChange={e => setMapping(m => ({ ...m, sign: e.target.value as CsvMapping['sign'] }))}>
            <option value="auto">{t('import.typeFromSign')}</option>
            <option value="all-expense">{t('import.typeAllExpense')}</option>
            <option value="all-income">{t('import.typeAllIncome')}</option>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={reset}>{t('common.back')}</Button>
            <Button onClick={handleMapContinue}>{t('common.continue')}</Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <CurrencySelect
              label={t('import.statementCurrency')}
              value={currency}
              onChange={setCurrency}
            />
            {hasExpenses && (
              <Select label={t('import.expenseCategory')} value={expenseCategoryId} onChange={e => setExpenseCategoryId(e.target.value)}>
                <option value="">{t('common.select')}</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            {hasIncomes && (
              <Select label={t('import.incomeCategory')} value={incomeCategoryId} onChange={e => setIncomeCategoryId(e.target.value)}>
                <option value="">{t('common.select')}</option>
                {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto border border-border-subtle rounded-lg divide-y divide-border-subtle">
            {rows.map((r, i) => (
              <label key={i} className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${r.included ? '' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={r.included}
                  onChange={() => setRows(prev => prev.map((p, j) => j === i ? { ...p, included: !p.included } : p))}
                  className="accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-content truncate">{r.description}</p>
                  <p className="text-xs text-content-3">
                    {formatDate(r.date)}
                    {r.duplicate && <span className="text-warning"> · {t('import.possibleDuplicate')}</span>}
                  </p>
                </div>
                <span className={`text-sm font-medium flex-shrink-0 ${r.type === 'expense' ? 'text-content' : 'text-success'}`}>
                  {r.type === 'expense' ? '-' : '+'}{money.formatIn(r.amount, currency)}
                </span>
              </label>
            ))}
          </div>

          <p className="text-xs text-content-3">
            {t('import.selectedCount', { included: included.length, total: rows.length })}
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={reset}>{t('common.back')}</Button>
            <Button onClick={handleImport} disabled={!canImport}>
              {t('import.importCount', { count: included.length })}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
