import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'
import { generateId } from '../utils/generateId'
import { useAuth } from '../contexts/AuthContext'

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
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setCategories(data.map(row => ({
            id: row.id, name: row.name, type: row.type, color: row.color,
            excludeFromCharts: row.exclude_from_charts ?? false,
          })))
        } else {
          setCategories([])
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
      }).then(({ error }) => {
        if (error) console.error('addCategory:', error)
      })
      return [...prev, newCat]
    })
    return newCat.id
  }

  const updateCategory = (id: string, data: Partial<Omit<Category, 'id'>>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    const { excludeFromCharts, ...rest } = data
    const dbData: Record<string, unknown> = { ...rest }
    if (excludeFromCharts !== undefined) dbData.exclude_from_charts = excludeFromCharts
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
