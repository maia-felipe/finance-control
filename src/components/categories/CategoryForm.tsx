import { useState } from 'react'
import { X } from 'lucide-react'
import type { Category, CategoryType } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { CATEGORY_ICONS } from '../../lib/categoryIcons'

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
  const [icon, setIcon] = useState(initial?.icon ?? 'tag')
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
    onSubmit({ name: name.trim(), type, color, icon, excludeFromCharts, subcategories })
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
        <label className="text-sm font-medium text-content">Ícone</label>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-label={key}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition cursor-pointer ${
                icon === key
                  ? 'ring-2 ring-accent bg-accent-soft text-accent'
                  : 'text-content-2 hover:bg-surface-2'
              }`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={excludeFromCharts}
          onChange={e => setExcludeFromCharts(e.target.checked)}
          className="w-4 h-4 rounded accent-primary"
        />
        <span className="text-sm text-content-2">Ocultar dos gráficos de gastos</span>
      </label>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-content">
          Subcategorias <span className="text-content-3 font-normal">(opcional)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSub}
            onChange={e => setNewSub(e.target.value)}
            onKeyDown={handleSubKeyDown}
            placeholder="Ex: Tech, Livros"
            className="flex-1 border border-border bg-surface text-content placeholder:text-content-3 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition"
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
                className="inline-flex items-center gap-1 bg-surface-2 text-content text-xs px-2 py-1 rounded-md"
              >
                {sub}
                <button
                  type="button"
                  onClick={() => handleRemoveSubcategory(sub)}
                  className="text-content-3 hover:text-danger cursor-pointer transition"
                  aria-label={`Remover ${sub}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-content-3">Enter para adicionar. Essas opções aparecerão na lista de desejos.</p>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
