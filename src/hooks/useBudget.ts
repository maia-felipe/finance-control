import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Budget } from '../types'

export function useBudget() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('budgets')
      .select('*')
      .then(({ data }) => {
        if (data) setBudgets(data.map(row => ({
          month: row.month,
          totalLimit: row.total_limit,
          categoryLimits: row.category_limits ?? {},
        })))
        setLoading(false)
      })
  }, [])

  const getBudget = (month: string): Budget =>
    budgets.find(b => b.month === month) ?? { month, totalLimit: 0, categoryLimits: {} }

  const saveBudget = (budget: Budget) => {
    setBudgets(prev => {
      const exists = prev.find(b => b.month === budget.month)
      return exists
        ? prev.map(b => b.month === budget.month ? budget : b)
        : [...prev, budget]
    })
    supabase.from('budgets').upsert({
      month: budget.month,
      total_limit: budget.totalLimit,
      category_limits: budget.categoryLimits,
    }).then(({ error }) => {
      if (error) console.error('saveBudget:', error)
    })
  }

  return { budgets, loading, getBudget, saveBudget }
}
