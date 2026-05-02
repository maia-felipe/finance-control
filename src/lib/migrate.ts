import { supabase } from './supabase'
import type { Transaction, Category, Budget, Investment } from '../types'

const MIGRATION_FLAG = 'fc_migrated'

function readLocalStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG)) return

  const transactions = readLocalStorage<Transaction>('fc_transactions')
  const categories = readLocalStorage<Category>('fc_categories')
  const budgets = readLocalStorage<Budget>('fc_budgets')
  const investments = readLocalStorage<Investment>('fc_investments')

  const hasLocalData = transactions.length > 0 || categories.length > 0 || budgets.length > 0 || investments.length > 0
  if (!hasLocalData) {
    localStorage.setItem(MIGRATION_FLAG, 'true')
    return
  }

  try {
    if (categories.length > 0) {
      await supabase.from('categories').upsert(
        categories.map((c, i) => ({
          id: c.id, name: c.name, type: c.type, color: c.color, sort_order: i,
        }))
      )
    }

    if (transactions.length > 0) {
      await supabase.from('transactions').upsert(
        transactions.map(t => ({
          id: t.id, date: t.date, amount: t.amount, type: t.type,
          category_id: t.categoryId, description: t.description, recurring: t.recurring,
        }))
      )
    }

    if (budgets.length > 0) {
      await supabase.from('budgets').upsert(
        budgets.map(b => ({
          month: b.month, total_limit: b.totalLimit, category_limits: b.categoryLimits,
        }))
      )
    }

    if (investments.length > 0) {
      await supabase.from('investments').upsert(
        investments.map(inv => ({
          id: inv.id, name: inv.name, category: inv.category,
          amount_invested: inv.amountInvested, current_value: inv.currentValue,
          start_date: inv.startDate, last_updated: inv.lastUpdated,
          color: inv.color, notes: inv.notes,
        }))
      )
    }

    localStorage.setItem(MIGRATION_FLAG, 'true')
    localStorage.removeItem('fc_transactions')
    localStorage.removeItem('fc_categories')
    localStorage.removeItem('fc_budgets')
    localStorage.removeItem('fc_investments')
  } catch (err) {
    console.error('Migração falhou:', err)
  }
}
