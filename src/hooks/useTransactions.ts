import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionType } from '../types'
import { generateId } from '../utils/generateId'
import { useAuth } from '../contexts/AuthContext'
import { useFx } from '../contexts/FxContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'
import { materializeRecurring } from '../lib/recurring'
import { currentMonth } from '../utils/formatDate'
import i18n from '../i18n'

/** Transação com o valor já convertido para a moeda preferida do usuário. */
export interface ConvertedTransaction extends Transaction {
  /** Convertido pela cotação da própria `date` — some com a mudança de moeda preferida. */
  convertedAmount: number
}

function txToRow(t: Transaction, userId: string) {
  return {
    id: t.id, user_id: userId, date: t.date, amount: t.amount, type: t.type,
    currency: t.currency,
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
  const { toPreferred } = useFx()
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
            toast.error(i18n.t('errors.loadTransactions'))
          }
          let txs: Transaction[] = data ? data.map(row => ({
            id: row.id, date: row.date, amount: row.amount,
            currency: (row.currency as string | null) ?? 'BRL',
            type: row.type, categoryId: row.category_id,
            description: row.description ?? '', recurring: row.recurring,
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
              persist(i18n.t('errors.postRecurring'),
                supabase.from('transactions').insert(created.map(t => txToRow(t, userId!))), run)
              toast.info(i18n.t('recurring.posted', { count: created.length }))
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

  // Recalculado quando a tabela de cotações chega ou a moeda preferida muda.
  const converted = useMemo<ConvertedTransaction[]>(
    () => transactions.map(t => ({
      ...t,
      convertedAmount: toPreferred(t.amount, t.currency, t.date) ?? t.amount,
    })),
    [transactions, toPreferred],
  )

  const addTransaction = (data: Omit<Transaction, 'id'>): string => {
    if (!user) return ''
    const newTx: Transaction = { ...data, id: generateId() }
    setTransactions(prev => [newTx, ...prev])
    persist(i18n.t('errors.saveTransaction'),
      supabase.from('transactions').insert(txToRow(newTx, user.id)), reload)
    return newTx.id
  }

  const updateTransaction = (id: string, data: Partial<Omit<Transaction, 'id'>>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
    const patch: Record<string, unknown> = {}
    if (data.date !== undefined) patch.date = data.date
    if (data.amount !== undefined) patch.amount = data.amount
    if (data.currency !== undefined) patch.currency = data.currency
    if (data.type !== undefined) patch.type = data.type
    if (data.categoryId !== undefined) patch.category_id = data.categoryId
    if (data.description !== undefined) patch.description = data.description
    if (data.recurring !== undefined) patch.recurring = data.recurring
    persist(i18n.t('errors.updateTransaction'),
      supabase.from('transactions').update(patch).eq('id', id), reload)
  }

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    persist(i18n.t('errors.deleteTransaction'),
      supabase.from('transactions').delete().eq('id', id), reload)
  }

  const getByMonth = (month: string) => converted.filter(t => t.date.startsWith(month))

  // Soma valores já convertidos: um saldo só faz sentido numa moeda só.
  const getCumulativeBalance = (month: string) =>
    converted
      .filter(t => t.date.slice(0, 7) <= month)
      .reduce((s, t) => s + (t.type === 'income' ? t.convertedAmount : -t.convertedAmount), 0)

  const retypeByCategory = (categoryId: string, newType: TransactionType) => {
    setTransactions(prev => prev.map(t => t.categoryId === categoryId ? { ...t, type: newType } : t))
    persist(i18n.t('errors.updateCategoryTransactions'),
      supabase.from('transactions').update({ type: newType }).eq('category_id', categoryId), reload)
  }

  const deleteByInvestmentId = (investmentId: string) => {
    setTransactions(prev => prev.filter(t => t.investmentId !== investmentId))
    persist(i18n.t('errors.deleteInvestmentTransactions'),
      supabase.from('transactions').delete().eq('investment_id', investmentId), reload)
  }

  // Remove transações associadas a uma compra da wishlist.
  // Pode ser um id de transação única OU um installment_group_id (compra parcelada).
  const removeByPurchaseRef = (ref: string) => {
    setTransactions(prev => prev.filter(t => t.id !== ref && t.installmentGroupId !== ref))
    persist(i18n.t('errors.deletePurchaseTransactions'),
      supabase.from('transactions').delete().or(`id.eq.${ref},installment_group_id.eq.${ref}`), reload)
  }

  return {
    transactions: converted, loading, addTransaction, updateTransaction, deleteTransaction,
    getByMonth, getCumulativeBalance, retypeByCategory, deleteByInvestmentId, removeByPurchaseRef,
  }
}
