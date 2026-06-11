import { useState } from 'react'
import type { Category, Transaction } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { toast } from '../../lib/toast'
import { formatDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'
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
        toast.error('Nenhuma transação encontrada no arquivo OFX.')
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
      toast.error('Nenhuma linha válida com esse mapeamento — confira as colunas e o formato de data.')
      return
    }
    if (skipped > 0) toast.info(`${skipped} linha(s) ignorada(s) por data ou valor inválido.`)
    toPreview(parsed)
  }

  const included = rows.filter(r => r.included)
  const hasExpenses = included.some(r => r.type === 'expense')
  const hasIncomes = included.some(r => r.type === 'income')
  const canImport = included.length > 0
    && (!hasExpenses || expenseCategoryId)
    && (!hasIncomes || incomeCategoryId)

  const handleImport = () => {
    onImport(included.map(r => ({
      date: r.date,
      amount: r.amount,
      type: r.type,
      categoryId: r.type === 'expense' ? expenseCategoryId : incomeCategoryId,
      description: r.description,
      recurring: false,
    })))
    toast.success(included.length === 1 ? '1 transação importada.' : `${included.length} transações importadas.`)
    close()
  }

  const colOptions = csvData?.headers.map((h, i) => (
    <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
  ))

  return (
    <Modal open={open} onClose={close} title="Importar extrato (CSV/OFX)">
      {step === 'file' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-2">
            Selecione um arquivo <strong>OFX</strong> (exportado pelo seu banco) ou <strong>CSV</strong>.
          </p>
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
          <p className="text-sm text-content-2">Indique o que cada coluna do CSV representa:</p>
          <Select label="Coluna da data" value={mapping.dateCol} onChange={e => setMapping(m => ({ ...m, dateCol: Number(e.target.value) }))}>
            {colOptions}
          </Select>
          <Select label="Coluna do valor" value={mapping.amountCol} onChange={e => setMapping(m => ({ ...m, amountCol: Number(e.target.value) }))}>
            {colOptions}
          </Select>
          <Select label="Coluna da descrição" value={mapping.descCol} onChange={e => setMapping(m => ({ ...m, descCol: Number(e.target.value) }))}>
            {colOptions}
          </Select>
          <Select label="Formato da data" value={mapping.dateFormat} onChange={e => setMapping(m => ({ ...m, dateFormat: e.target.value as CsvDateFormat }))}>
            <option value="dd/MM/yyyy">dd/mm/aaaa (31/12/2026)</option>
            <option value="yyyy-MM-dd">aaaa-mm-dd (2026-12-31)</option>
            <option value="MM/dd/yyyy">mm/dd/aaaa (12/31/2026)</option>
          </Select>
          <Select label="Tipo das transações" value={mapping.sign} onChange={e => setMapping(m => ({ ...m, sign: e.target.value as CsvMapping['sign'] }))}>
            <option value="auto">Pelo sinal do valor (negativo = gasto)</option>
            <option value="all-expense">Todas são gastos</option>
            <option value="all-income">Todas são receitas</option>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={reset}>Voltar</Button>
            <Button onClick={handleMapContinue}>Continuar</Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {hasExpenses && (
              <Select label="Categoria para gastos" value={expenseCategoryId} onChange={e => setExpenseCategoryId(e.target.value)}>
                <option value="">Selecione...</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            {hasIncomes && (
              <Select label="Categoria para receitas" value={incomeCategoryId} onChange={e => setIncomeCategoryId(e.target.value)}>
                <option value="">Selecione...</option>
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
                    {r.duplicate && <span className="text-warning"> · possível duplicata</span>}
                  </p>
                </div>
                <span className={`text-sm font-medium flex-shrink-0 ${r.type === 'expense' ? 'text-content' : 'text-success'}`}>
                  {r.type === 'expense' ? '-' : '+'}{formatCurrency(r.amount)}
                </span>
              </label>
            ))}
          </div>

          <p className="text-xs text-content-3">
            {included.length} de {rows.length} selecionada(s). Possíveis duplicatas vêm desmarcadas.
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={reset}>Voltar</Button>
            <Button onClick={handleImport} disabled={!canImport}>
              Importar {included.length > 0 ? `(${included.length})` : ''}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
