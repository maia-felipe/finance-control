import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { WishlistItem } from '../types'
import { generateId } from '../utils/generateId'
import { useAuth } from '../contexts/AuthContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'
import i18n from '../i18n'

function rowToItem(row: Record<string, unknown>): WishlistItem {
  return {
    id: row.id as string,
    name: row.name as string,
    url: (row.url as string | null) ?? undefined,
    price: row.price as number,
    currency: (row.currency as string | null) ?? 'BRL',
    category: (row.category as string | null) ?? undefined,
    subcategory: (row.subcategory as string | null) ?? undefined,
    priority: (row.priority as number) ?? 3,
    plannedInstallments: (row.planned_installments as number) ?? 1,
    purchased: (row.purchased as boolean) ?? false,
    purchasedAt: (row.purchased_at as string | null) ?? undefined,
    transactionId: (row.transaction_id as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    createdAt: row.created_at as string,
  }
}

export function useWishlist() {
  const { user } = useAuth()
  const userId = user?.id
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  // Busca o estado atual no Supabase. Também usada como "rollback" das
  // mutações otimistas: se uma gravação falha, ressincroniza com o banco.
  const reload = useCallback(() => {
    // Sem usuário não há o que buscar — as páginas que usam o hook nem montam.
    if (!userId) return
    supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('loadWishlist:', error)
          toast.error(i18n.t('errors.loadWishlist'))
        }
        if (data) setItems(data.map(rowToItem))
        else setItems([])
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const addItem = (data: Omit<WishlistItem, 'id' | 'createdAt' | 'purchased' | 'purchasedAt'>): string => {
    if (!user) return ''
    const createdAt = new Date().toISOString()
    const newItem: WishlistItem = {
      ...data,
      id: generateId(),
      purchased: false,
      createdAt,
    }
    setItems(prev => [newItem, ...prev])
    persist(i18n.t('errors.saveWishlistItem'), supabase.from('wishlist_items').insert({
      id: newItem.id,
      user_id: user.id,
      name: newItem.name,
      url: newItem.url ?? null,
      price: newItem.price,
      currency: newItem.currency,
      category: newItem.category ?? null,
      subcategory: newItem.subcategory ?? null,
      priority: newItem.priority,
      planned_installments: newItem.plannedInstallments ?? 1,
      purchased: false,
      purchased_at: null,
      notes: newItem.notes ?? null,
      created_at: createdAt,
    }), reload)
    return newItem.id
  }

  const updateItem = (id: string, data: Partial<Omit<WishlistItem, 'id' | 'createdAt'>>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    const patch: Record<string, unknown> = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.url !== undefined) patch.url = data.url ?? null
    if (data.price !== undefined) patch.price = data.price
    if (data.currency !== undefined) patch.currency = data.currency
    if (data.category !== undefined) patch.category = data.category ?? null
    if (data.subcategory !== undefined) patch.subcategory = data.subcategory ?? null
    if (data.priority !== undefined) patch.priority = data.priority
    if (data.plannedInstallments !== undefined) patch.planned_installments = data.plannedInstallments
    if (data.purchased !== undefined) patch.purchased = data.purchased
    if (data.purchasedAt !== undefined) patch.purchased_at = data.purchasedAt ?? null
    if (data.transactionId !== undefined) patch.transaction_id = data.transactionId ?? null
    if (data.notes !== undefined) patch.notes = data.notes ?? null
    persist(i18n.t('errors.updateWishlistItem'),
      supabase.from('wishlist_items').update(patch).eq('id', id), reload)
  }

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    persist(i18n.t('errors.deleteWishlistItem'),
      supabase.from('wishlist_items').delete().eq('id', id), reload)
  }

  return { items, loading, addItem, updateItem, deleteItem }
}
