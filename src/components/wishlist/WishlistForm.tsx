import { useMemo, useState } from 'react'
import type { WishlistItem } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { StarRating } from './StarRating'
import { useCategories } from '../../hooks/useCategories'

type WishlistFormData = Omit<WishlistItem, 'id' | 'createdAt' | 'purchased' | 'purchasedAt'>

interface WishlistFormProps {
  initial?: Partial<WishlistItem>
  onSubmit: (data: WishlistFormData) => void
  onCancel: () => void
}

export function WishlistForm({ initial, onSubmit, onCancel }: WishlistFormProps) {
  const { categories } = useCategories()

  // Apenas categorias de gasto ('expense' e 'both')
  const availableCategories = useMemo(
    () => categories.filter(c => c.type === 'expense' || c.type === 'both'),
    [categories]
  )

  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial?.price?.toFixed(2) ?? '')
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
    if (!name.trim()) e.name = 'Nome é obrigatório'
    const priceNum = parseFloat(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) e.price = 'Preço inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name: name.trim(),
      price: parseFloat(price),
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
        label="Nome do item"
        value={name}
        onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
        error={errors.name}
        placeholder="Ex: MacBook Pro M4"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Preço total (R$)"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={e => { setPrice(e.target.value); setErrors(p => ({ ...p, price: '' })) }}
          error={errors.price}
          placeholder="0,00"
        />
        <div className="flex flex-col gap-1">
          <Input
            label="Parcelas planejadas"
            type="number"
            min="1"
            max="60"
            step="1"
            value={plannedInstallments}
            onChange={e => setPlannedInstallments(Math.max(1, parseInt(e.target.value) || 1))}
          />
          {plannedInstallments > 1 && parseFloat(price) > 0 && (
            <p className="text-xs text-indigo-600">
              ≈ R$ {(parseFloat(price) / plannedInstallments).toFixed(2)}/mês
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Categoria"
          value={category}
          onChange={e => handleCategoryChange(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {availableCategories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </Select>
        <Select
          label="Subcategoria"
          value={subcategory}
          onChange={e => setSubcategory(e.target.value)}
          disabled={!category || subcategoryOptions.length === 0}
        >
          <option value="">
            {!category
              ? 'Escolha uma categoria'
              : subcategoryOptions.length === 0
                ? 'Sem subcategorias'
                : 'Sem subcategoria'}
          </option>
          {subcategoryOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      {category && subcategoryOptions.length === 0 && (
        <p className="text-xs text-slate-400 -mt-2">
          Adicione subcategorias na aba <strong>Categorias</strong> ao editar "{category}".
        </p>
      )}

      <Input
        label="Link (opcional)"
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://..."
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Prioridade</label>
        <StarRating value={priority} onChange={setPriority} size="lg" />
        <span className="text-xs text-slate-400">Clique nas estrelas para definir</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Observações <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ex: Esperando entrar em promoção"
          rows={2}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
