import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Budget } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function useBudget() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      setBudgets([])
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setBudgets(data.map(row => ({
          month: row.month,
          totalLimit: row.total_limit,
          categoryLimits: row.category_limits ?? {},
        })))
        else setBudgets([])
        setLoading(false)
      })
  }, [user?.id])

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
    supabase.from('budgets').upsert({
      user_id: user.id,
      month: budget.month,
      total_limit: budget.totalLimit,
      category_limits: budget.categoryLimits,
    }, { onConflict: 'user_id,month' }).then(({ error }) => {
      if (error) console.error('saveBudget:', error)
    })
  }

  return { budgets, loading, getBudget, saveBudget }
}
