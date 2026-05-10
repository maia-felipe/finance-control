import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Investment } from '../types'
import { generateId } from '../utils/generateId'
import { todayISO } from '../utils/formatDate'
import { useAuth } from '../contexts/AuthContext'

export function useInvestments() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      setInvestments([])
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('investments')
      .select('*')
      .then(({ data }) => {
        if (data) setInvestments(data.map(row => ({
          id: row.id, name: row.name, category: row.category,
          amountInvested: row.amount_invested, currentValue: row.current_value,
          startDate: row.start_date, lastUpdated: row.last_updated,
          color: row.color, notes: row.notes,
        })))
        else setInvestments([])
        setLoading(false)
      })
  }, [user?.id])

  const addInvestment = (data: Omit<Investment, 'id' | 'lastUpdated'>): string => {
    if (!user) return ''
    const newInv: Investment = { ...data, id: generateId(), lastUpdated: todayISO() }
    setInvestments(prev => [newInv, ...prev])
    supabase.from('investments').insert({
      id: newInv.id, user_id: user.id, name: newInv.name, category: newInv.category,
      amount_invested: newInv.amountInvested, current_value: newInv.currentValue,
      start_date: newInv.startDate, last_updated: newInv.lastUpdated,
      color: newInv.color, notes: newInv.notes,
    }).then(({ error }) => {
      if (error) console.error('addInvestment:', error)
    })
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
    supabase.from('investments').update(patch).eq('id', id).then(({ error }) => {
      if (error) console.error('updateInvestment:', error)
    })
  }

  const deleteInvestment = (id: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== id))
    supabase.from('investments').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('deleteInvestment:', error)
    })
  }

  return { investments, loading, addInvestment, updateInvestment, deleteInvestment }
}
