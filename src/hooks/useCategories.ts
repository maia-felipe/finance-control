import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'
import { generateId } from '../utils/generateId'
import { useAuth } from '../contexts/AuthContext'

type DefaultCategory = Pick<Category, 'name' | 'type' | 'color'>

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Alimentação', type: 'expense', color: '#f97316' },
  { name: 'Transporte', type: 'expense', color: '#3b82f6' },
  { name: 'Moradia', type: 'expense', color: '#8b5cf6' },
  { name: 'Saúde', type: 'expense', color: '#10b981' },
  { name: 'Lazer', type: 'expense', color: '#ec4899' },
  { name: 'Educação', type: 'expense', color: '#eab308' },
  { name: 'Outros', type: 'expense', color: '#6b7280' },
  { name: 'Salário', type: 'income', color: '#16a34a' },
  { name: 'Freelance', type: 'income', color: '#0d9488' },
]

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      setCategories([])
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          setCategories(data.map(row => ({
            id: row.id, name: row.name, type: row.type, color: row.color,
            excludeFromCharts: row.exclude_from_charts ?? false,
            subcategories: row.subcategories ?? [],
          })))
        } else {
          // Usuário novo (ou sem categorias) — seed das padrão com IDs únicos
          const seeded: Category[] = DEFAULT_CATEGORIES.map(c => ({
            ...c,
            id: generateId(),
            excludeFromCharts: false,
          }))
          const rows = seeded.map((c, i) => ({
            id: c.id, user_id: userId, name: c.name, type: c.type,
            color: c.color, sort_order: i, exclude_from_charts: false,
          }))
          const { error } = await supabase.from('categories').insert(rows)
          if (error) {
            console.error('seedDefaultCategories:', error)
            setCategories([])
          } else {
            setCategories(seeded)
          }
        }
        setLoading(false)
      })
  }, [user?.id])

  const addCategory = (data: Omit<Category, 'id'>): string => {
    if (!user) return ''
    const newCat: Category = { ...data, id: generateId() }
    setCategories(prev => {
      supabase.from('categories').insert({
        id: newCat.id, user_id: user.id, name: newCat.name, type: newCat.type,
        color: newCat.color, sort_order: prev.length,
        exclude_from_charts: newCat.excludeFromCharts ?? false,
        subcategories: newCat.subcategories ?? [],
      }).then(({ error }) => {
        if (error) console.error('addCategory:', error)
      })
      return [...prev, newCat]
    })
    return newCat.id
  }

  const updateCategory = (id: string, data: Partial<Omit<Category, 'id'>>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    const { excludeFromCharts, subcategories, ...rest } = data
    const dbData: Record<string, unknown> = { ...rest }
    if (excludeFromCharts !== undefined) dbData.exclude_from_charts = excludeFromCharts
    if (subcategories !== undefined) dbData.subcategories = subcategories
    supabase.from('categories').update(dbData).eq('id', id).then(({ error }) => {
      if (error) console.error('updateCategory:', error)
    })
  }

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    supabase.from('categories').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('deleteCategory:', error)
    })
  }

  const getCategoryById = (id: string) => categories.find(c => c.id === id)

  const reorderCategories = (orderedIds: string[]) => {
    setCategories(prev => {
      const map = Object.fromEntries(prev.map(c => [c.id, c]))
      const reordered = orderedIds.map(id => map[id]).filter(Boolean)
      const rest = prev.filter(c => !orderedIds.includes(c.id))
      const final = [...reordered, ...rest]
      // Persist order
      final.forEach((c, i) => {
        supabase.from('categories').update({ sort_order: i }).eq('id', c.id).then(({ error }) => {
          if (error) console.error('reorderCategories:', error)
        })
      })
      return final
    })
  }

  return { categories, loading, addCategory, updateCategory, deleteCategory, getCategoryById, reorderCategories }
}
