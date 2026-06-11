import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionType } from '../types'
import { generateId } from '../utils/generateId'
import { useAuth } from '../contexts/AuthContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'
import { materializeRecurring } from '../lib/recurring'
import { currentMonth } from '../utils/formatDate'

function txToRow(t: Transaction, userId: string) {
  return {
    id: t.id, user_id: userId, date: t.date, amount: t.amount, type: t.type,
    category_id: t.categoryId, description: t.description, recurring: t.recurring,
    investment_id: t.investmentId ?? null,
    installment_group_id: t.installmentGroupId ?? null,
  }
}

// Garante que o motor de recorrência rode no máximo uma vez por usuário/mês
// por sessão (o hook é montado por várias páginas; a checagem por chave de
// série também o torna idempotente entre dispositivos).
const recurringRuns = new Set<string>()

export function useTransactions() {
  const { user } = useAuth()
  const userId = user?.id
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Busca o estado atual no Supabase. Também usada como "rollback" das
  // mutações otimistas: se uma gravação falha, ressincroniza com o banco.
  // run é uma function declaration (içada) para poder se referenciar como
  // resync no insert das recorrências sem "usar antes de declarar".
  const reload = useCallback(() => {
    function run() {
      // Sem usuário não há o que buscar — as páginas que usam o hook nem montam.
      if (!userId) return
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('loadTransactions:', error)
            toast.error('Não foi possível carregar as transações.')
          }
          let txs: Transaction[] = data ? data.map(row => ({
            id: row.id, date: row.date, amount: row.amount,
            type: row.type, categoryId: row.category_id,
            description: row.description, recurring: row.recurring,
            investmentId: row.investment_id ?? undefined,
            installmentGroupId: row.installment_group_id ?? undefined,
          })) : []

          // Motor de recorrência: materializa as ocorrências do mês corrente
          // das transações recorrentes (uma vez por usuário/mês por sessão).
          const month = currentMonth()
          const runKey = `${userId}:${month}`
          if (!error && !recurringRuns.has(runKey)) {
            recurringRuns.add(runKey)
            const created = materializeRecurring(txs, month)
            if (created.length > 0) {
              txs = [...created, ...txs].sort((a, b) => b.date.localeCompare(a.date))
              persist('Não foi possível lançar as transações recorrentes.',
                supabase.from('transactions').insert(created.map(t => txToRow(t, userId!))), run)
              toast.info(created.length === 1
                ? '1 transação recorrente lançada.'
                : `${created.length} transações recorrentes lançadas.`)
            }
          }

          setTransactions(txs)
          setLoading(false)
        })
    }
    run()
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const addTransaction = (data: Omit<Transaction, 'id'>): string => {
    if (!user) return ''
    const newTx: Transaction = { ...data, id: generateId() }
    setTransactions(prev => [newTx, ...prev])
    persist('Não foi possível salvar a transação.',
      supabase.from('transactions').insert(txToRow(newTx, user.id)), reload)
    return newTx.id
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
    persist('Não foi possível atualizar a transação.',
      supabase.from('transactions').update(patch).eq('id', id), reload)
  }

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    persist('Não foi possível excluir a transação.',
      supabase.from('transactions').delete().eq('id', id), reload)
  }

  const getByMonth = (month: string) => transactions.filter(t => t.date.startsWith(month))

  const getCumulativeBalance = (month: string) =>
    transactions
      .filter(t => t.date.slice(0, 7) <= month)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)

  const retypeByCategory = (categoryId: string, newType: TransactionType) => {
    setTransactions(prev => prev.map(t => t.categoryId === categoryId ? { ...t, type: newType } : t))
    persist('Não foi possível atualizar as transações da categoria.',
      supabase.from('transactions').update({ type: newType }).eq('category_id', categoryId), reload)
  }

  const deleteByInvestmentId = (investmentId: string) => {
    setTransactions(prev => prev.filter(t => t.investmentId !== investmentId))
    persist('Não foi possível excluir as transações do investimento.',
      supabase.from('transactions').delete().eq('investment_id', investmentId), reload)
  }

  // Remove transações associadas a uma compra da wishlist.
  // Pode ser um id de transação única OU um installment_group_id (compra parcelada).
  const removeByPurchaseRef = (ref: string) => {
    setTransactions(prev => prev.filter(t => t.id !== ref && t.installmentGroupId !== ref))
    persist('Não foi possível excluir as transações da compra.',
      supabase.from('transactions').delete().or(`id.eq.${ref},installment_group_id.eq.${ref}`), reload)
  }

  return { transactions, loading, addTransaction, updateTransaction, deleteTransaction, getByMonth, getCumulativeBalance, retypeByCategory, deleteByInvestmentId, removeByPurchaseRef }
}
