import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Investment } from '../types'
import { generateId } from '../utils/generateId'
import { todayISO } from '../utils/formatDate'
import { useAuth } from '../contexts/AuthContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'
import i18n from '../i18n'
import { useMoney } from './useMoney'

export function useInvestments() {
  const { user } = useAuth()
  const userId = user?.id
  const { convertBetweenToday } = useMoney()
  // Linhas como estão no banco. Para posições de câmbio, `currentValue` daqui
  // não é a verdade — ver a marcação a mercado abaixo.
  const [rows, setRows] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)

  // Busca o estado atual no Supabase. Também usada como "rollback" das
  // mutações otimistas: se uma gravação falha, ressincroniza com o banco.
  const reload = useCallback(() => {
    // Sem usuário não há o que buscar — as páginas que usam o hook nem montam.
    if (!userId) return
    supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          console.error('loadInvestments:', error)
          toast.error(i18n.t('errors.loadInvestments'))
        }
        if (data) setRows(data.map(row => ({
          id: row.id, name: row.name, category: row.category,
          amountInvested: row.amount_invested, currentValue: row.current_value,
          currency: (row.currency as string | null) ?? 'BRL',
          startDate: row.start_date, lastUpdated: row.last_updated,
          color: row.color, notes: row.notes,
          quantity: row.quantity ?? undefined,
          holdingCurrency: (row.holding_currency as string | null) ?? undefined,
        })))
        else setRows([])
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  // Uma posição de câmbio vale quantidade x cotação de hoje. O current_value
  // gravado é só o último valor digitado e envelhece no dia seguinte, então
  // para 'fx' ele é substituído pelo valor de mercado. Feito aqui (e não na
  // tela) porque Dashboard, resumo, alocação e cards leem o mesmo campo — a
  // mesma lição do orçamento: converter na origem, não em cada call site.
  const investments = useMemo(() => rows.map(row => {
    if (row.category !== 'fx' || !row.quantity || !row.holdingCurrency) return row
    const marked = convertBetweenToday(row.quantity, row.holdingCurrency, row.currency)
    // Sem cotação, mantém o último valor conhecido em vez de zerar a posição.
    return marked === null ? row : { ...row, currentValue: marked }
  }), [rows, convertBetweenToday])

  const addInvestment = (data: Omit<Investment, 'id' | 'lastUpdated'>): string => {
    if (!user) return ''
    const newInv: Investment = { ...data, id: generateId(), lastUpdated: todayISO() }
    setRows(prev => [newInv, ...prev])
    persist(i18n.t('errors.saveInvestment'), supabase.from('investments').insert({
      id: newInv.id, user_id: user.id, name: newInv.name, category: newInv.category,
      amount_invested: newInv.amountInvested, current_value: newInv.currentValue,
      currency: newInv.currency,
      start_date: newInv.startDate, last_updated: newInv.lastUpdated,
      color: newInv.color, notes: newInv.notes,
      quantity: newInv.quantity ?? null,
      holding_currency: newInv.holdingCurrency ?? null,
    }), reload)
    return newInv.id
  }

  const updateInvestment = (id: string, data: Partial<Omit<Investment, 'id'>>) => {
    const lastUpdated = todayISO()
    setRows(prev => prev.map(inv => inv.id === id ? { ...inv, ...data, lastUpdated } : inv))
    const patch: Record<string, unknown> = { last_updated: lastUpdated }
    if (data.name !== undefined) patch.name = data.name
    if (data.category !== undefined) patch.category = data.category
    if (data.amountInvested !== undefined) patch.amount_invested = data.amountInvested
    if (data.currentValue !== undefined) patch.current_value = data.currentValue
    if (data.currency !== undefined) patch.currency = data.currency
    if (data.startDate !== undefined) patch.start_date = data.startDate
    if (data.color !== undefined) patch.color = data.color
    if (data.notes !== undefined) patch.notes = data.notes
    if (data.quantity !== undefined) patch.quantity = data.quantity
    if (data.holdingCurrency !== undefined) patch.holding_currency = data.holdingCurrency
    persist(i18n.t('errors.updateInvestment'),
      supabase.from('investments').update(patch).eq('id', id), reload)
  }

  const deleteInvestment = (id: string) => {
    setRows(prev => prev.filter(inv => inv.id !== id))
    persist(i18n.t('errors.deleteInvestment'),
      supabase.from('investments').delete().eq('id', id), reload)
  }

  return { investments, loading, addInvestment, updateInvestment, deleteInvestment }
}
