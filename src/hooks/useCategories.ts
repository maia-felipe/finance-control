import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'
import { generateId } from '../utils/generateId'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense', color: '#f97316' },
  { id: 'cat-2', name: 'Transporte', type: 'expense', color: '#3b82f6' },
  { id: 'cat-3', name: 'Moradia', type: 'expense', color: '#8b5cf6' },
  { id: 'cat-4', name: 'Saúde', type: 'expense', color: '#10b981' },
  { id: 'cat-5', name: 'Lazer', type: 'expense', color: '#ec4899' },
  { id: 'cat-6', name: 'Educação', type: 'expense', color: '#eab308' },
  { id: 'cat-7', name: 'Outros', type: 'expense', color: '#6b7280' },
  { id: 'cat-8', name: 'Salário', type: 'income', color: '#16a34a' },
  { id: 'cat-9', name: 'Freelance', type: 'income', color: '#0d9488' },
]

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          setCategories(data.map(row => ({
            id: row.id, name: row.name, type: row.type, color: row.color,
          })))
        } else if (!localStorage.getItem('fc_migrated')) {
          // Seed padrão na primeira vez
          await supabase.from('categories').insert(
            DEFAULT_CATEGORIES.map((c, i) => ({
              id: c.id, name: c.name, type: c.type, color: c.color, sort_order: i,
            }))
          )
          setCategories(DEFAULT_CATEGORIES)
        }
        setLoading(false)
      })
  }, [])

  const addCategory = (data: Omit<Category, 'id'>): string => {
    const newCat: Category = { ...data, id: generateId() }
    setCategories(prev => {
      supabase.from('categories').insert({
        id: newCat.id, name: newCat.name, type: newCat.type,
        color: newCat.color, sort_order: prev.length,
      }).then(({ error }) => {
        if (error) console.error('addCategory:', error)
      })
      return [...prev, newCat]
    })
    return newCat.id
  }

  const updateCategory = (id: string, data: Partial<Omit<Category, 'id'>>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    supabase.from('categories').update(data).eq('id', id).then(({ error }) => {
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
