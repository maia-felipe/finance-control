import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Investment, InvestmentCategory, CurrencyCode } from '../../types'
import { INVESTMENT_CATEGORIES } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { CurrencySelect } from '../ui/CurrencySelect'
import { useSettings } from '../../contexts/SettingsContext'
import { useMoney } from '../../hooks/useMoney'
import { todayISO } from '../../utils/formatDate'

const CATEGORY_COLORS: Record<InvestmentCategory, string> = {
  fixed_income: '#3b82f6',
  stocks: '#8b5cf6',
  reits: '#f97316',
  crypto: '#f59e0b',
  fx: '#10b981',
  other: '#6b7280',
}

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#f59e0b', '#10b981', '#ec4899', '#6b7280', '#ef4444', '#0d9488', '#06b6d4']

interface InvestmentFormProps {
  initial?: Partial<Investment>
  onSubmit: (data: Omit<Investment, 'id' | 'lastUpdated'>) => void
  onCancel: () => void
}

export function InvestmentForm({ initial, onSubmit, onCancel }: InvestmentFormProps) {
  const { t } = useTranslation()
  const { preferredCurrency, trackCurrency } = useSettings()
  const money = useMoney()
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<InvestmentCategory>(initial?.category ?? 'fixed_income')
  const [amountInvested, setAmountInvested] = useState(initial?.amountInvested?.toFixed(2) ?? '')
  const [currentValue, setCurrentValue] = useState(initial?.currentValue?.toFixed(2) ?? '')
  // Moeda em que o investimento é mantido — dólares guardados nos EUA continuam
  // sendo dólares mesmo com a moeda preferida em reais.
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? preferredCurrency)
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '')
  // Só para câmbio: a moeda que você realmente guarda. `currency` acima é a
  // moeda com que você pagou e acompanha a posição.
  const [holdingCurrency, setHoldingCurrency] = useState<CurrencyCode>(
    initial?.holdingCurrency ?? (preferredCurrency === 'USD' ? 'BRL' : 'USD'),
  )
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO())
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS.fixed_income)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isFx = category === 'fx'

  const handleCategoryChange = (cat: InvestmentCategory) => {
    setCategory(cat)
    if (!initial?.color) setColor(CATEGORY_COLORS[cat])
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = t('investmentForm.nameRequired')
    if (!amountInvested || Number(amountInvested) <= 0) e.amountInvested = t('investmentForm.invalidAmount')
    // Em câmbio o valor atual é derivado da cotação, não digitado.
    if (!isFx && (!currentValue || Number(currentValue) < 0)) e.currentValue = t('investmentForm.invalidAmount')
    if (isFx && (!quantity || Number(quantity) <= 0)) e.quantity = t('investmentForm.invalidQuantity')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    trackCurrency(currency)
    if (isFx) trackCurrency(holdingCurrency)
    const qty = parseFloat(quantity)
    // Em câmbio o valor atual é sempre recalculado na leitura; grava-se o valor
    // de mercado de hoje só para a coluna não ficar incoerente no banco.
    const marked = isFx ? money.convertBetweenToday(qty, holdingCurrency, currency) : null
    onSubmit({
      name: name.trim(),
      category,
      amountInvested: parseFloat(amountInvested),
      currentValue: isFx ? (marked ?? parseFloat(amountInvested)) : parseFloat(currentValue),
      currency,
      startDate,
      color,
      notes: notes.trim(),
      quantity: isFx ? qty : undefined,
      holdingCurrency: isFx ? holdingCurrency : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label={t('investmentForm.nameLabel')}
        value={name}
        onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
        error={errors.name}
        placeholder={t('investmentForm.namePlaceholder')}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={t('common.category')}
          value={category}
          onChange={e => handleCategoryChange(e.target.value as InvestmentCategory)}
        >
          {INVESTMENT_CATEGORIES.map(c => (
            <option key={c} value={c}>{t(`investments.categories.${c}`)}</option>
          ))}
        </Select>
        <CurrencySelect
          label={t('settings.currencySection')}
          value={currency}
          onChange={setCurrency}
          compact
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('investmentForm.amountInvestedLabel', { currency })}
          type="number"
          min="0"
          step="0.01"
          placeholder={t('transactionForm.amountPlaceholder')}
          value={amountInvested}
          onChange={e => { setAmountInvested(e.target.value); setErrors(p => ({ ...p, amountInvested: '' })) }}
          error={errors.amountInvested}
        />
        {!isFx && (
          <Input
            label={t('investmentForm.currentValueLabel', { currency })}
            type="number"
            min="0"
            step="0.01"
            placeholder={t('transactionForm.amountPlaceholder')}
            value={currentValue}
            onChange={e => { setCurrentValue(e.target.value); setErrors(p => ({ ...p, currentValue: '' })) }}
            error={errors.currentValue}
          />
        )}
        {isFx && (
          <CurrencySelect
            label={t('investmentForm.holdingCurrency')}
            value={holdingCurrency}
            onChange={setHoldingCurrency}
            compact
          />
        )}
      </div>

      {isFx && (
        <div className="flex flex-col gap-1">
          <Input
            label={t('investmentForm.quantityLabel', { currency: holdingCurrency })}
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={quantity}
            onChange={e => { setQuantity(e.target.value); setErrors(p => ({ ...p, quantity: '' })) }}
            error={errors.quantity}
          />
          <p className="text-xs text-content-3">{t('investmentForm.derivedValueHint')}</p>
        </div>
      )}

      <Input
        label={t('investmentForm.startDate')}
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-content">{t('categoryForm.color')}</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition cursor-pointer ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-accent' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-content">
          {t('common.notes')} <span className="text-content-3 font-normal">({t('common.optional')})</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('investmentForm.notesPlaceholder')}
          rows={2}
          className="border border-border bg-surface text-content placeholder:text-content-3 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  )
}
