import { useState } from 'react'
import type { Category, CategoryType } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899',
  '#eab308', '#6b7280', '#16a34a', '#0d9488', '#ef4444',
  '#06b6d4', '#f59e0b',
]

interface CategoryFormProps {
  initial?: Partial<Category>
  onSubmit: (data: Omit<Category, 'id'>) => void
  onCancel: () => void
}

export function CategoryForm({ initial, onSubmit, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<CategoryType>(initial?.type ?? 'expense')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    onSubmit({ name: name.trim(), type, color })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nome da categoria"
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        error={error}
        placeholder="Ex: Academia"
        autoFocus
      />
      <Select
        label="Tipo"
        value={type}
        onChange={e => setType(e.target.value as CategoryType)}
      >
        <option value="expense">Gasto</option>
        <option value="income">Receita</option>
        <option value="investment">Investimento</option>
        <option value="both">Ambos</option>
      </Select>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition cursor-pointer ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
