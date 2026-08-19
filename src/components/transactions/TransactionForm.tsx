import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Transaction, TransactionType, CurrencyCode } from '../../types'
import { useCategories } from '../../hooks/useCategories'
import { useSettings } from '../../contexts/SettingsContext'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { MoneyField } from '../ui/CurrencySelect'
import { todayISO } from '../../utils/formatDate'

interface TransactionFormProps {
  initial?: Partial<Transaction>
  onSubmit: (data: Omit<Transaction, 'id'>) => void
  onCancel: () => void
}

export function TransactionForm({ initial, onSubmit, onCancel }: TransactionFormProps) {
  const { t } = useTranslation()
  const { categories } = useCategories()
  const { preferredCurrency, trackCurrency } = useSettings()
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial?.amount?.toFixed(2) ?? '')
  // Novos lançamentos nascem na moeda preferida, mas dá para trocar por
  // lançamento — comprar em euros morando nos EUA é o caso normal, não a exceção.
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? preferredCurrency)
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [recurring, setRecurring] = useState(initial?.recurring ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredCategories = categories.filter(
    c => c.type === type || c.type === 'both'
  )

  const validate = () => {
    const e: Record<string, string> = {}
    if (!date) e.date = t('transactionForm.dateRequired')
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = t('transactionForm.invalidAmount')
    if (!categoryId) e.categoryId = t('transactionForm.selectCategory')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    trackCurrency(currency)
    onSubmit({
      date,
      type,
      amount: parseFloat(amount),
      currency,
      categoryId,
      description: description.trim(),
      recurring,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('common.date')}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          error={errors.date}
        />
        <Select
          label={t('common.type')}
          value={type}
          onChange={e => { setType(e.target.value as TransactionType); setCategoryId('') }}
        >
          <option value="expense">{t('txType.expense')}</option>
          <option value="income">{t('txType.income')}</option>
          <option value="investment">{t('txType.investment')}</option>
        </Select>
      </div>

      <MoneyField
        label={t('common.amount')}
        amount={amount}
        currency={currency}
        onAmountChange={setAmount}
        onCurrencyChange={setCurrency}
        error={errors.amount}
        placeholder={t('transactionForm.amountPlaceholder')}
      />

      <Select
        label={t('common.category')}
        value={categoryId}
        onChange={e => setCategoryId(e.target.value)}
        error={errors.categoryId}
      >
        <option value="">{t('common.select')}</option>
        {filteredCategories.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      <Input
        label={t('transactionForm.descriptionOptional')}
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder={t('transactionForm.descriptionPlaceholder')}
      />

      <label className="flex items-center gap-2 text-sm text-content cursor-pointer">
        <input
          type="checkbox"
          checked={recurring}
          onChange={e => setRecurring(e.target.checked)}
          className="rounded border-border"
        />
        {t('common.recurring')}
      </label>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  )
}
