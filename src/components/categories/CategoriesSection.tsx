import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { GripVertical } from 'lucide-react'
import { CategoryIcon } from '../ui/CategoryIcon'
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
  const { t } = useTranslation()
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
          className="text-content-3 hover:text-content-2 cursor-grab active:cursor-grabbing touch-none px-0.5"
          aria-label={t('common.dragToReorder')}
        >
          <GripVertical size={15} />
        </button>
        <CategoryIcon icon={category.icon} color={category.color} size="sm" />
        <span className="text-sm font-medium text-content">{category.name}</span>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => onEdit(category)}>{t('common.edit')}</Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(category.id)}>{t('common.remove')}</Button>
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
      <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wide mb-3">{title}</h2>
      <Card>
        {categories.length === 0 ? (
          <p className="text-sm text-content-3 text-center py-4">{emptyMsg}</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-border-subtle">
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

/**
 * Gestão de categorias. Vive dentro da página de Configurações — deixou de ser
 * uma aba própria, por isso não tem título nem padding de página.
 */
export function CategoriesSection() {
  const { t } = useTranslation()
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
    <div>
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wide">{t('categories.expenses')}</h2>
            <Button size="sm" variant="secondary" onClick={() => handleAdd('expense')}>+ {t('common.add')}</Button>
          </div>
          <SortableSection
            title=""
            categories={expenseCategories}
            onReorder={ids => reorderCategories([...ids, ...incomeCategories.map(c => c.id), ...investmentCategories.map(c => c.id)])}
            onEdit={setEditing}
            onDelete={deleteCategory}
            emptyMsg={t('categories.noExpenseCategories')}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wide">{t('categories.income')}</h2>
            <Button size="sm" variant="secondary" onClick={() => handleAdd('income')}>+ {t('common.add')}</Button>
          </div>
          <SortableSection
            title=""
            categories={incomeCategories}
            onReorder={ids => reorderCategories([...expenseCategories.map(c => c.id), ...ids, ...investmentCategories.map(c => c.id)])}
            onEdit={setEditing}
            onDelete={deleteCategory}
            emptyMsg={t('categories.noIncomeCategories')}
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wide">{t('categories.investments')}</h2>
            <Button size="sm" variant="secondary" onClick={() => handleAdd('investment')}>+ {t('common.add')}</Button>
          </div>
          <SortableSection
            title=""
            categories={investmentCategories}
            onReorder={ids => reorderCategories([...expenseCategories.map(c => c.id), ...incomeCategories.map(c => c.id), ...ids])}
            onEdit={setEditing}
            onDelete={deleteCategory}
            emptyMsg={t('categories.noInvestmentCategories')}
          />
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('categories.newCategory')}>
        <CategoryForm
          initial={{ type: addType }}
          onSubmit={data => { addCategory(data); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={t('categories.editCategory')}>
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
