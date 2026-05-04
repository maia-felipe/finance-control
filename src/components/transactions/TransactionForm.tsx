import { useState } from 'react'
import type { Transaction, TransactionType } from '../../types'
import { useCategories } from '../../hooks/useCategories'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { todayISO } from '../../utils/formatDate'

interface TransactionFormProps {
  initial?: Partial<Transaction>
  onSubmit: (data: Omit<Transaction, 'id'>) => void
  onCancel: () => void
}

export function TransactionForm({ initial, onSubmit, onCancel }: TransactionFormProps) {
  const { categories } = useCategories()
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial?.amount?.toFixed(2) ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [recurring, setRecurring] = useState(initial?.recurring ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredCategories = categories.filter(
    c => c.type === type || c.type === 'both'
  )

  const validate = () => {
    const e: Record<string, string> = {}
    if (!date) e.date = 'Data é obrigatória'
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = 'Valor inválido'
    if (!categoryId) e.categoryId = 'Selecione uma categoria'
    if (!description.trim()) e.description = 'Descrição é obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      date,
      type,
      amount: parseFloat(amount),
      categoryId,
      description: description.trim(),
      recurring,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Data"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          error={errors.date}
        />
        <Select
          label="Tipo"
          value={type}
          onChange={e => { setType(e.target.value as TransactionType); setCategoryId('') }}
        >
          <option value="expense">Gasto</option>
          <option value="income">Receita</option>
          <option value="investment">Investimento</option>
        </Select>
      </div>

      <Input
        label="Valor (R$)"
        type="number"
        min="0"
        step="0.01"
        placeholder="0,00"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        error={errors.amount}
      />

      <Select
        label="Categoria"
        value={categoryId}
        onChange={e => setCategoryId(e.target.value)}
        error={errors.categoryId}
      >
        <option value="">Selecione...</option>
        {filteredCategories.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      <Input
        label="Descrição"
        value={description}
        onChange={e => setDescription(e.target.value)}
        error={errors.description}
        placeholder="Ex: Almoço no restaurante"
      />

      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={recurring}
          onChange={e => setRecurring(e.target.checked)}
          className="rounded border-slate-300"
        />
        Recorrente
      </label>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
