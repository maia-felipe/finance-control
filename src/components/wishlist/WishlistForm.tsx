import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WishlistItem, CurrencyCode } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { StarRating } from './StarRating'
import { useCategories } from '../../hooks/useCategories'
import { useMoney } from '../../hooks/useMoney'
import { useSettings } from '../../contexts/SettingsContext'
import { MoneyField } from '../ui/CurrencySelect'

type WishlistFormData = Omit<WishlistItem, 'id' | 'createdAt' | 'purchased' | 'purchasedAt'>

interface WishlistFormProps {
  initial?: Partial<WishlistItem>
  onSubmit: (data: WishlistFormData) => void
  onCancel: () => void
}

export function WishlistForm({ initial, onSubmit, onCancel }: WishlistFormProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const { preferredCurrency, trackCurrency } = useSettings()
  const { categories } = useCategories()

  // Apenas categorias de gasto ('expense' e 'both')
  const availableCategories = useMemo(
    () => categories.filter(c => c.type === 'expense' || c.type === 'both'),
    [categories]
  )

  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial?.price?.toFixed(2) ?? '')
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? preferredCurrency)
  // Se o valor inicial não existir na lista atual (ex: item legado), começa vazio
  const initialCategoryValid = initial?.category && availableCategories.some(c => c.name === initial.category)
  const [category, setCategory] = useState(initialCategoryValid ? initial!.category! : '')
  const selectedCategory = useMemo(
    () => availableCategories.find(c => c.name === category),
    [availableCategories, category]
  )
  const subcategoryOptions = selectedCategory?.subcategories ?? []
  const initialSubValid = initial?.subcategory && subcategoryOptions.includes(initial.subcategory)
  const [subcategory, setSubcategory] = useState(initialSubValid ? initial!.subcategory! : '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 3)
  const [plannedInstallments, setPlannedInstallments] = useState(initial?.plannedInstallments ?? 1)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat)
    // Reset subcategoria quando muda a categoria pai
    setSubcategory('')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = t('wishlistForm.nameRequired')
    const priceNum = parseFloat(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) e.price = t('wishlistForm.priceInvalid')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    trackCurrency(currency)
    onSubmit({
      name: name.trim(),
      price: parseFloat(price),
      currency,
      plannedInstallments,
      category: category || undefined,
      subcategory: subcategory || undefined,
      url: url.trim() || undefined,
      priority,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label={t('wishlistForm.nameLabel')}
        value={name}
        onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
        error={errors.name}
        placeholder={t('wishlistForm.namePlaceholder')}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyField
          label={t('wishlistForm.priceLabel', { currency })}
          amount={price}
          currency={currency}
          onAmountChange={value => { setPrice(value); setErrors(p => ({ ...p, price: '' })) }}
          onCurrencyChange={setCurrency}
          error={errors.price}
        />
        <div className="flex flex-col gap-1">
          <Input
            label={t('wishlistForm.installmentsLabel')}
            type="number"
            min="1"
            max="60"
            step="1"
            value={plannedInstallments}
            onChange={e => setPlannedInstallments(Math.max(1, parseInt(e.target.value) || 1))}
          />
          {plannedInstallments > 1 && parseFloat(price) > 0 && (
            <p className="text-xs text-accent">
              {t('wishlistForm.perMonth', { amount: money.formatIn(parseFloat(price) / plannedInstallments, currency) })}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={t('common.category')}
          value={category}
          onChange={e => handleCategoryChange(e.target.value)}
        >
          <option value="">{t('wishlistForm.noCategory')}</option>
          {availableCategories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </Select>
        <Select
          label={t('common.subcategory')}
          value={subcategory}
          onChange={e => setSubcategory(e.target.value)}
          disabled={!category || subcategoryOptions.length === 0}
        >
          <option value="">
            {!category
              ? t('wishlistForm.chooseCategoryFirst')
              : subcategoryOptions.length === 0
                ? t('wishlistForm.noSubcategories')
                : t('wishlistForm.noSubcategory')}
          </option>
          {subcategoryOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      {category && subcategoryOptions.length === 0 && (
        <p className="text-xs text-content-3 -mt-2">{t('wishlistForm.categoriesHint')}</p>
      )}

      <Input
        label={t('wishlistForm.linkLabel')}
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://..."
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-content">{t('wishlistForm.priority')}</label>
        <StarRating value={priority} onChange={setPriority} size="lg" />
        <span className="text-xs text-content-3">{t('wishlistForm.priorityHint')}</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-content">
          {t('common.notes')} <span className="text-content-3 font-normal">({t('common.optional')})</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('wishlistForm.notesPlaceholder')}
          rows={2}
          className="border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  )
}
