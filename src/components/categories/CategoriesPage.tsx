import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCategories } from '../../hooks/useCategories'
import { useTransactions } from '../../hooks/useTransactions'
import type { Category } from '../../types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { CategoryForm } from './CategoryForm'

interface SortableItemProps {
  category: Category
  onEdit: (c: Category) => void
  onDelete: (id: string) => void
}

function SortableItem({ category, onEdit, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none px-0.5"
          aria-label="Arrastar para reordenar"
        >
          ⠿
        </button>
        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: category.color }} />
        <span className="text-sm font-medium text-slate-800">{category.name}</span>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => onEdit(category)}>Editar</Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(category.id)}>Remover</Button>
      </div>
    </div>
  )
}

interface SortableSectionProps {
  title: string
  categories: Category[]
  onReorder: (ids: string[]) => void
  onEdit: (c: Category) => void
  onDelete: (id: string) => void
  emptyMsg: string
}

function SortableSection({ title, categories, onReorder, onEdit, onDelete, emptyMsg }: SortableSectionProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    onReorder(arrayMove(categories, oldIndex, newIndex).map(c => c.id))
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</h2>
      <Card>
        {categories.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">{emptyMsg}</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-slate-50">
                {categories.map(cat => (
                  <SortableItem key={cat.id} category={cat} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>
    </div>
  )
}

export function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory, reorderCategories } = useCategories()
  const { retypeByCategory } = useTransactions()
  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState<'expense' | 'income' | 'investment'>('expense')
  const [editing, setEditing] = useState<Category | null>(null)

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')
  const incomeCategories = categories.filter(c => c.type === 'income' || c.type === 'both')
  const investmentCategories = categories.filter(c => c.type === 'investment')

  const handleAdd = (type: 'expense' | 'income' | 'investment') => {
    setAddType(type)
    setShowAdd(true)
  }

  const handleEditSubmit = (data: Omit<Category, 'id'>) => {
    if (!editing) return
    updateCategory(editing.id, data)
    if (data.type !== editing.type && data.type !== 'both') {
      retypeByCategory(editing.id, data.type)
    }
    setEditing(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Categorias</h1>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Gastos</h2>
            <Button size="sm" variant="secondary" onClick={() => handleAdd('expense')}>+ Adicionar</Button>
          </div>
          <SortableSection
            title=""
            categories={expenseCategories}
            onReorder={ids => reorderCategories([...ids, ...incomeCategories.map(c => c.id), ...investmentCategories.map(c => c.id)])}
            onEdit={setEditing}
            onDelete={deleteCategory}
            emptyMsg="Nenhuma categoria de gasto."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Receitas</h2>
            <Button size="sm" variant="secondary" onClick={() => handleAdd('income')}>+ Adicionar</Button>
          </div>
          <SortableSection
            title=""
            categories={incomeCategories}
            onReorder={ids => reorderCategories([...expenseCategories.map(c => c.id), ...ids, ...investmentCategories.map(c => c.id)])}
            onEdit={setEditing}
            onDelete={deleteCategory}
            emptyMsg="Nenhuma categoria de receita."
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Investimentos</h2>
            <Button size="sm" variant="secondary" onClick={() => handleAdd('investment')}>+ Adicionar</Button>
          </div>
          <SortableSection
            title=""
            categories={investmentCategories}
            onReorder={ids => reorderCategories([...expenseCategories.map(c => c.id), ...incomeCategories.map(c => c.id), ...ids])}
            onEdit={setEditing}
            onDelete={deleteCategory}
            emptyMsg="Nenhuma categoria de investimento."
          />
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nova categoria">
        <CategoryForm
          initial={{ type: addType }}
          onSubmit={data => { addCategory(data); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar categoria">
        {editing && (
          <CategoryForm
            initial={editing}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
