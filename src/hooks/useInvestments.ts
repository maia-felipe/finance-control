import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Investment } from '../types'
import { generateId } from '../utils/generateId'
import { todayISO } from '../utils/formatDate'
import { useAuth } from '../contexts/AuthContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'

export function useInvestments() {
  const { user } = useAuth()
  const userId = user?.id
  const [investments, setInvestments] = useState<Investment[]>([])
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
          toast.error('Não foi possível carregar os investimentos.')
        }
        if (data) setInvestments(data.map(row => ({
          id: row.id, name: row.name, category: row.category,
          amountInvested: row.amount_invested, currentValue: row.current_value,
          startDate: row.start_date, lastUpdated: row.last_updated,
          color: row.color, notes: row.notes,
          quantity: row.quantity ?? undefined,
        })))
        else setInvestments([])
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const addInvestment = (data: Omit<Investment, 'id' | 'lastUpdated'>): string => {
    if (!user) return ''
    const newInv: Investment = { ...data, id: generateId(), lastUpdated: todayISO() }
    setInvestments(prev => [newInv, ...prev])
    persist('Não foi possível salvar o investimento.', supabase.from('investments').insert({
      id: newInv.id, user_id: user.id, name: newInv.name, category: newInv.category,
      amount_invested: newInv.amountInvested, current_value: newInv.currentValue,
      start_date: newInv.startDate, last_updated: newInv.lastUpdated,
      color: newInv.color, notes: newInv.notes,
      quantity: newInv.quantity ?? null,
    }), reload)
    return newInv.id
  }

  const updateInvestment = (id: string, data: Partial<Omit<Investment, 'id'>>) => {
    const lastUpdated = todayISO()
    setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, ...data, lastUpdated } : inv))
    const patch: Record<string, unknown> = { last_updated: lastUpdated }
    if (data.name !== undefined) patch.name = data.name
    if (data.category !== undefined) patch.category = data.category
    if (data.amountInvested !== undefined) patch.amount_invested = data.amountInvested
    if (data.currentValue !== undefined) patch.current_value = data.currentValue
    if (data.startDate !== undefined) patch.start_date = data.startDate
    if (data.color !== undefined) patch.color = data.color
    if (data.notes !== undefined) patch.notes = data.notes
    if (data.quantity !== undefined) patch.quantity = data.quantity
    persist('Não foi possível atualizar o investimento.',
      supabase.from('investments').update(patch).eq('id', id), reload)
  }

  const deleteInvestment = (id: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== id))
    persist('Não foi possível excluir o investimento.',
      supabase.from('investments').delete().eq('id', id), reload)
  }

  return { investments, loading, addInvestment, updateInvestment, deleteInvestment }
}
