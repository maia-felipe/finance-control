import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addMonths, format, parseISO } from 'date-fns'
import type { TransactionType, WishlistItem, CurrencyCode } from '../../types'
import { useCategories } from '../../hooks/useCategories'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { todayISO, formatMonth } from '../../utils/formatDate'
import { useMoney } from '../../hooks/useMoney'
import { useSettings } from '../../contexts/SettingsContext'
import { MoneyField } from '../ui/CurrencySelect'

export interface PurchaseFormData {
  date: string
  amount: number
  currency: CurrencyCode
  type: TransactionType
  categoryId: string
  description: string
  installments: number          // 1 = compra simples; >1 = parcelada
  firstInstallmentDate: string  // só relevante se installments > 1 (senão usa `date`)
}

interface PurchaseFormProps {
  item: WishlistItem
  onSubmit: (data: PurchaseFormData) => void
  onCancel: () => void
}

export function PurchaseForm({ item, onSubmit, onCancel }: PurchaseFormProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const { trackCurrency } = useSettings()
  const { categories } = useCategories()

  // Pré-seleciona a categoria de transação se o nome bater com a da wishlist
  const initialCategoryId = useMemo(() => {
    const match = categories.find(c => c.name === item.category)
    return match?.id ?? ''
  }, [categories, item.category])

  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState(item.price.toFixed(2))
  const [currency, setCurrency] = useState<CurrencyCode>(item.currency)
  const [type] = useState<TransactionType>('expense')
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [description, setDescription] = useState(item.name)

  // Sincroniza a categoria pré-selecionada quando as categorias terminam de carregar
  // (na primeira render do form, `categories` pode estar vazio ainda).
  useEffect(() => {
    if (initialCategoryId) setCategoryId(initialCategoryId)
  }, [initialCategoryId])
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState(2)
  const [firstDate, setFirstDate] = useState(todayISO())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')

  const amountNum = parseFloat(amount) || 0
  const installmentValue = isInstallment && installments > 0 ? amountNum / installments : amountNum
  const lastDate = isInstallment ? addMonths(parseISO(firstDate), installments - 1) : null

  const validate = () => {
    const e: Record<string, string> = {}
    if (!date) e.date = t('transactionForm.dateRequired')
    if (!amountNum || amountNum <= 0) e.amount = t('transactionForm.invalidAmount')
    if (!categoryId) e.categoryId = t('transactionForm.selectCategory')
    if (!description.trim()) e.description = t('purchaseForm.descriptionRequired')
    if (isInstallment) {
      if (installments < 2) e.installments = t('purchaseForm.installmentsMin')
      if (installments > 60) e.installments = t('purchaseForm.installmentsMax')
      if (!firstDate) e.firstDate = t('purchaseForm.dateRequired')
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    trackCurrency(currency)
    onSubmit({
      date: isInstallment ? firstDate : date,
      amount: amountNum,
      currency,
      type,
      categoryId,
      description: description.trim(),
      installments: isInstallment ? installments : 1,
      firstInstallmentDate: isInstallment ? firstDate : date,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-content-2 -mt-1">{t('purchaseForm.intro')}</p>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('purchaseForm.purchaseDate')}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          error={errors.date}
          disabled={isInstallment}
        />
        <MoneyField
          label={t('purchaseForm.totalAmount', { currency })}
          amount={amount}
          currency={currency}
          onAmountChange={setAmount}
          onCurrencyChange={setCurrency}
          error={errors.amount}
        />
      </div>

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
        label={t('common.description')}
        value={description}
        onChange={e => setDescription(e.target.value)}
        error={errors.description}
      />

      {/* Toggle parcelamento */}
      <div className="border-t border-border-subtle pt-4 flex flex-col gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isInstallment}
            onChange={e => setIsInstallment(e.target.checked)}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm font-medium text-content">{t('purchaseForm.installmentPayment')}</span>
        </label>

        {isInstallment && (
          <div className="flex flex-col gap-3 pl-6 border-l-2 border-accent-soft">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('purchaseForm.installmentCount')}
                type="number"
                min="2"
                max="60"
                step="1"
                value={installments}
                onChange={e => setInstallments(parseInt(e.target.value) || 0)}
                error={errors.installments}
              />
              <Input
                label={t('purchaseForm.firstInstallmentOn')}
                type="date"
                value={firstDate}
                onChange={e => setFirstDate(e.target.value)}
                error={errors.firstDate}
              />
            </div>

            {installments >= 2 && firstDate && lastDate && (
              <div className="text-xs text-content-2 bg-accent-soft rounded-md px-3 py-2 flex flex-col gap-0.5">
                <span className="text-accent font-semibold">
                  {t('purchaseForm.timesCount', { amount: money.formatIn(installmentValue, currency), count: installments })}
                </span>
                <span>
                  {t('purchaseForm.lastInstallment', { month: formatMonth(format(lastDate, 'yyyy-MM')) })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  )
}
