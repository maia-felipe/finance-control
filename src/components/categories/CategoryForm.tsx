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
  const [excludeFromCharts, setExcludeFromCharts] = useState(initial?.excludeFromCharts ?? false)
  const [subcategories, setSubcategories] = useState<string[]>(initial?.subcategories ?? [])
  const [newSub, setNewSub] = useState('')
  const [error, setError] = useState('')

  const handleAddSubcategory = () => {
    const trimmed = newSub.trim()
    if (!trimmed) return
    if (subcategories.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSub('')
      return
    }
    setSubcategories(prev => [...prev, trimmed])
    setNewSub('')
  }

  const handleRemoveSubcategory = (sub: string) => {
    setSubcategories(prev => prev.filter(s => s !== sub))
  }

  const handleSubKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSubcategory()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    onSubmit({ name: name.trim(), type, color, excludeFromCharts, subcategories })
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
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={excludeFromCharts}
          onChange={e => setExcludeFromCharts(e.target.checked)}
          className="w-4 h-4 rounded accent-indigo-500"
        />
        <span className="text-sm text-slate-600">Ocultar dos gráficos de gastos</span>
      </label>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">
          Subcategorias <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSub}
            onChange={e => setNewSub(e.target.value)}
            onKeyDown={handleSubKeyDown}
            placeholder="Ex: Tech, Livros"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
          />
          <Button type="button" variant="secondary" onClick={handleAddSubcategory}>
            Adicionar
          </Button>
        </div>
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subcategories.map(sub => (
              <span
                key={sub}
                className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md"
              >
                {sub}
                <button
                  type="button"
                  onClick={() => handleRemoveSubcategory(sub)}
                  className="text-slate-400 hover:text-red-500 cursor-pointer transition"
                  aria-label={`Remover ${sub}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400">Enter para adicionar. Essas opções aparecerão na lista de desejos.</p>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
