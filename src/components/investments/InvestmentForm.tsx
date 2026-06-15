import { useState } from 'react'
import type { Investment, InvestmentCategory } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { todayISO } from '../../utils/formatDate'

const CATEGORIES: InvestmentCategory[] = ['Renda Fixa', 'Ações', 'FII', 'Cripto', 'Câmbio', 'Outro']

const CATEGORY_COLORS: Record<InvestmentCategory, string> = {
  'Renda Fixa': '#3b82f6',
  'Ações': '#8b5cf6',
  'FII': '#f97316',
  'Cripto': '#f59e0b',
  'Câmbio': '#10b981',
  'Outro': '#6b7280',
}

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#f59e0b', '#10b981', '#ec4899', '#6b7280', '#ef4444', '#0d9488', '#06b6d4']

interface InvestmentFormProps {
  initial?: Partial<Investment>
  onSubmit: (data: Omit<Investment, 'id' | 'lastUpdated'>) => void
  onCancel: () => void
}

export function InvestmentForm({ initial, onSubmit, onCancel }: InvestmentFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<InvestmentCategory>(initial?.category ?? 'Renda Fixa')
  const [amountInvested, setAmountInvested] = useState(initial?.amountInvested?.toFixed(2) ?? '')
  const [currentValue, setCurrentValue] = useState(initial?.currentValue?.toFixed(2) ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO())
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS['Renda Fixa'])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleCategoryChange = (cat: InvestmentCategory) => {
    setCategory(cat)
    if (!initial?.color) setColor(CATEGORY_COLORS[cat])
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nome é obrigatório'
    if (!amountInvested || Number(amountInvested) <= 0) e.amountInvested = 'Valor inválido'
    if (!currentValue || Number(currentValue) < 0) e.currentValue = 'Valor inválido'
    if (category === 'Câmbio' && (!quantity || Number(quantity) <= 0)) e.quantity = 'Quantidade inválida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name: name.trim(),
      category,
      amountInvested: parseFloat(amountInvested),
      currentValue: parseFloat(currentValue),
      startDate,
      color,
      notes: notes.trim(),
      quantity: category === 'Câmbio' ? parseFloat(quantity) : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nome do investimento"
        value={name}
        onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
        error={errors.name}
        placeholder="Ex: Tesouro Selic 2029, PETR4"
        autoFocus
      />

      <Select
        label="Categoria"
        value={category}
        onChange={e => handleCategoryChange(e.target.value as InvestmentCategory)}
      >
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Valor aportado (R$)"
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={amountInvested}
          onChange={e => { setAmountInvested(e.target.value); setErrors(p => ({ ...p, amountInvested: '' })) }}
          error={errors.amountInvested}
        />
        <Input
          label="Valor atual (R$)"
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={currentValue}
          onChange={e => { setCurrentValue(e.target.value); setErrors(p => ({ ...p, currentValue: '' })) }}
          error={errors.currentValue}
        />
      </div>

      {category === 'Câmbio' && (
        <Input
          label="Quantidade (ex: US$)"
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={quantity}
          onChange={e => { setQuantity(e.target.value); setErrors(p => ({ ...p, quantity: '' })) }}
          error={errors.quantity}
        />
      )}

      <Input
        label="Data de início"
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-content">Cor</label>
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
        <label className="text-sm font-medium text-content">Observações <span className="text-content-3 font-normal">(opcional)</span></label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ex: Vence em Jan/2029, taxa 11,5% a.a."
          rows={2}
          className="border border-border bg-surface text-content placeholder:text-content-3 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
