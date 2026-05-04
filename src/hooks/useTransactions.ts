import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionType } from '../types'
import { generateId } from '../utils/generateId'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (data) setTransactions(data.map(row => ({
          id: row.id, date: row.date, amount: row.amount,
          type: row.type, categoryId: row.category_id,
          description: row.description, recurring: row.recurring,
          investmentId: row.investment_id ?? undefined,
        })))
        setLoading(false)
      })
  }, [])

  const addTransaction = (data: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...data, id: generateId() }
    setTransactions(prev => [newTx, ...prev])
    supabase.from('transactions').insert({
      id: newTx.id, date: newTx.date, amount: newTx.amount, type: newTx.type,
      category_id: newTx.categoryId, description: newTx.description, recurring: newTx.recurring,
      investment_id: newTx.investmentId ?? null,
    }).then(({ error }) => {
      if (error) {
        console.error('addTransaction:', error)
        setTransactions(prev => prev.filter(t => t.id !== newTx.id))
      }
    })
  }

  const updateTransaction = (id: string, data: Partial<Omit<Transaction, 'id'>>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
    const patch: Record<string, unknown> = {}
    if (data.date !== undefined) patch.date = data.date
    if (data.amount !== undefined) patch.amount = data.amount
    if (data.type !== undefined) patch.type = data.type
    if (data.categoryId !== undefined) patch.category_id = data.categoryId
    if (data.description !== undefined) patch.description = data.description
    if (data.recurring !== undefined) patch.recurring = data.recurring
    supabase.from('transactions').update(patch).eq('id', id).then(({ error }) => {
      if (error) console.error('updateTransaction:', error)
    })
  }

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    supabase.from('transactions').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('deleteTransaction:', error)
    })
  }

  const getByMonth = (month: string) => transactions.filter(t => t.date.startsWith(month))

  const getCumulativeBalance = (month: string) =>
    transactions
      .filter(t => t.date.slice(0, 7) <= month)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)

  const retypeByCategory = (categoryId: string, newType: TransactionType) => {
    setTransactions(prev => prev.map(t => t.categoryId === categoryId ? { ...t, type: newType } : t))
    supabase.from('transactions').update({ type: newType }).eq('category_id', categoryId).then(({ error }) => {
      if (error) console.error('retypeByCategory:', error)
    })
  }

  const deleteByInvestmentId = (investmentId: string) => {
    setTransactions(prev => prev.filter(t => t.investmentId !== investmentId))
    supabase.from('transactions').delete().eq('investment_id', investmentId).then(({ error }) => {
      if (error) console.error('deleteByInvestmentId:', error)
    })
  }

  return { transactions, loading, addTransaction, updateTransaction, deleteTransaction, getByMonth, getCumulativeBalance, retypeByCategory, deleteByInvestmentId }
}
