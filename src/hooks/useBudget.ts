import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Budget } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'

export function useBudget() {
  const { user } = useAuth()
  const userId = user?.id
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  // Busca o estado atual no Supabase. Também usada como "rollback" das
  // mutações otimistas: se uma gravação falha, ressincroniza com o banco.
  const reload = useCallback(() => {
    // Sem usuário não há o que buscar — as páginas que usam o hook nem montam.
    if (!userId) return
    supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          console.error('loadBudgets:', error)
          toast.error('Não foi possível carregar os orçamentos.')
        }
        if (data) setBudgets(data.map(row => ({
          month: row.month,
          totalLimit: row.total_limit,
          categoryLimits: row.category_limits ?? {},
        })))
        else setBudgets([])
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const getBudget = (month: string): Budget =>
    budgets.find(b => b.month === month) ?? { month, totalLimit: 0, categoryLimits: {} }

  const saveBudget = (budget: Budget) => {
    if (!user) return
    setBudgets(prev => {
      const exists = prev.find(b => b.month === budget.month)
      return exists
        ? prev.map(b => b.month === budget.month ? budget : b)
        : [...prev, budget]
    })
    persist('Não foi possível salvar o orçamento.', supabase.from('budgets').upsert({
      user_id: user.id,
      month: budget.month,
      total_limit: budget.totalLimit,
      category_limits: budget.categoryLimits,
    }, { onConflict: 'user_id,month' }), reload)
  }

  return { budgets, loading, getBudget, saveBudget }
}
