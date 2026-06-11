import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'
import { generateId } from '../utils/generateId'
import { useAuth } from '../contexts/AuthContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'

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

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Category['type'],
    color: row.color as string,
    excludeFromCharts: (row.exclude_from_charts as boolean | null) ?? false,
    subcategories: (row.subcategories as string[] | null) ?? [],
  }
}

export function useCategories() {
  const { user } = useAuth()
  const userId = user?.id
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Ressincroniza com o banco após uma gravação falhar (rollback do estado
  // otimista). Não faz seed — isso é responsabilidade só da carga inicial.
  const reload = useCallback(() => {
    if (!userId) return
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('reloadCategories:', error)
        else if (data) setCategories(data.map(rowToCategory))
      })
  }, [userId])

  // Carga inicial: além de buscar, faz seed das categorias padrão para
  // usuários novos (o reload de resync acima nunca faz seed).
  const loadAndSeed = useCallback(() => {
    // Sem usuário não há o que buscar — as páginas que usam o hook nem montam.
    if (!userId) return
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .then(async ({ data, error }) => {
        if (error) {
          console.error('loadCategories:', error)
          toast.error('Não foi possível carregar as categorias.')
          setCategories([])
        } else if (data && data.length > 0) {
          setCategories(data.map(rowToCategory))
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
          const { error: seedError } = await supabase.from('categories').insert(rows)
          if (seedError) {
            console.error('seedDefaultCategories:', seedError)
            toast.error('Não foi possível criar as categorias padrão.')
            setCategories([])
          } else {
            setCategories(seeded)
          }
        }
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    loadAndSeed()
  }, [loadAndSeed])

  const addCategory = (data: Omit<Category, 'id'>): string => {
    if (!user) return ''
    const newCat: Category = { ...data, id: generateId() }
    setCategories(prev => {
      persist('Não foi possível salvar a categoria.', supabase.from('categories').insert({
        id: newCat.id, user_id: user.id, name: newCat.name, type: newCat.type,
        color: newCat.color, sort_order: prev.length,
        exclude_from_charts: newCat.excludeFromCharts ?? false,
        subcategories: newCat.subcategories ?? [],
      }), reload)
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
    persist('Não foi possível atualizar a categoria.',
      supabase.from('categories').update(dbData).eq('id', id), reload)
  }

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    persist('Não foi possível excluir a categoria.',
      supabase.from('categories').delete().eq('id', id), reload)
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
        persist('Não foi possível salvar a ordem das categorias.',
          supabase.from('categories').update({ sort_order: i }).eq('id', c.id), reload)
      })
      return final
    })
  }

  return { categories, loading, addCategory, updateCategory, deleteCategory, getCategoryById, reorderCategories }
}
