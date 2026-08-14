import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Budget } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'
import i18n from '../i18n'
import { useSettings } from '../contexts/SettingsContext'
import { useMoney } from './useMoney'

const round2 = (n: number) => Math.round(n * 100) / 100

export function useBudget() {
  const { user } = useAuth()
  const userId = user?.id
  const { preferredCurrency } = useSettings()
  const { convertToday } = useMoney()
  // Linhas como estão no banco, cada uma na moeda em que foi definida.
  const [rows, setRows] = useState<Budget[]>([])
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
          toast.error(i18n.t('errors.loadBudgets'))
        }
        if (data) setRows(data.map(row => ({
          month: row.month,
          totalLimit: row.total_limit,
          categoryLimits: row.category_limits ?? {},
          currency: (row.currency as string | null) ?? 'BRL',
        })))
        else setRows([])
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  // Orçamento é prospectivo: converte pela cotação de hoje, não pela do mês.
  //
  // A conversão é feita aqui e não em cada tela de propósito. Dashboard,
  // Relatórios, WishlistInsights e a própria BudgetPage leem totalLimit /
  // categoryLimits direto; se cada uma precisasse lembrar de converter, bastava
  // uma esquecer para exibir R$100 como $100. Saindo daqui já na moeda
  // preferida, o caminho seguro é o padrão.
  const budgets = useMemo(() => rows.map(row => ({
    month: row.month,
    // Arredonda: esses números voltam para inputs numéricos na BudgetPage.
    totalLimit: round2(convertToday(row.totalLimit, row.currency)),
    categoryLimits: Object.fromEntries(
      Object.entries(row.categoryLimits).map(([id, v]) => [id, round2(convertToday(v, row.currency))])
    ),
    currency: preferredCurrency,
  })), [rows, convertToday, preferredCurrency])

  const getBudget = (month: string): Budget =>
    budgets.find(b => b.month === month) ?? { month, totalLimit: 0, categoryLimits: {}, currency: preferredCurrency }

  // `budget` chega já na moeda preferida (é o que a tela edita), então vai para
  // o banco como está, marcado com essa moeda.
  const saveBudget = (budget: Budget) => {
    if (!user) return
    setRows(prev => {
      const exists = prev.find(b => b.month === budget.month)
      return exists
        ? prev.map(b => b.month === budget.month ? budget : b)
        : [...prev, budget]
    })
    persist(i18n.t('errors.saveBudget'), supabase.from('budgets').upsert({
      user_id: user.id,
      month: budget.month,
      total_limit: budget.totalLimit,
      category_limits: budget.categoryLimits,
      currency: budget.currency,
    }, { onConflict: 'user_id,month' }), reload)
  }

  return { budgets, loading, getBudget, saveBudget }
}
