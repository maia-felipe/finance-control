import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { WishlistItem } from '../types'
import { generateId } from '../utils/generateId'
import { useAuth } from '../contexts/AuthContext'

function rowToItem(row: Record<string, unknown>): WishlistItem {
  return {
    id: row.id as string,
    name: row.name as string,
    url: (row.url as string | null) ?? undefined,
    price: row.price as number,
    category: (row.category as string | null) ?? undefined,
    subcategory: (row.subcategory as string | null) ?? undefined,
    priority: (row.priority as number) ?? 3,
    purchased: (row.purchased as boolean) ?? false,
    purchasedAt: (row.purchased_at as string | null) ?? undefined,
    transactionId: (row.transaction_id as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    createdAt: row.created_at as string,
  }
}

export function useWishlist() {
  const { user } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('wishlist_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setItems(data.map(rowToItem))
        else setItems([])
        setLoading(false)
      })
  }, [user?.id])

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
    supabase.from('wishlist_items').insert({
      id: newItem.id,
      user_id: user.id,
      name: newItem.name,
      url: newItem.url ?? null,
      price: newItem.price,
      category: newItem.category ?? null,
      subcategory: newItem.subcategory ?? null,
      priority: newItem.priority,
      purchased: false,
      purchased_at: null,
      notes: newItem.notes ?? null,
      created_at: createdAt,
    }).then(({ error }) => {
      if (error) {
        console.error('addItem:', error)
        setItems(prev => prev.filter(i => i.id !== newItem.id))
      }
    })
    return newItem.id
  }

  const updateItem = (id: string, data: Partial<Omit<WishlistItem, 'id' | 'createdAt'>>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    const patch: Record<string, unknown> = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.url !== undefined) patch.url = data.url ?? null
    if (data.price !== undefined) patch.price = data.price
    if (data.category !== undefined) patch.category = data.category ?? null
    if (data.subcategory !== undefined) patch.subcategory = data.subcategory ?? null
    if (data.priority !== undefined) patch.priority = data.priority
    if (data.purchased !== undefined) patch.purchased = data.purchased
    if (data.purchasedAt !== undefined) patch.purchased_at = data.purchasedAt ?? null
    if (data.transactionId !== undefined) patch.transaction_id = data.transactionId ?? null
    if (data.notes !== undefined) patch.notes = data.notes ?? null
    supabase.from('wishlist_items').update(patch).eq('id', id).then(({ error }) => {
      if (error) console.error('updateItem:', error)
    })
  }

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    supabase.from('wishlist_items').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('deleteItem:', error)
    })
  }

  return { items, loading, addItem, updateItem, deleteItem }
}
