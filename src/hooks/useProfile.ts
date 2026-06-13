import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { useAuth } from '../contexts/AuthContext'

// Acesso à IA é restrito a admin/tester: as análises chamam a Anthropic API e
// custam dinheiro real. Trial e assinatura premium foram desativados — este é
// um projeto pessoal/portfólio, não um SaaS pago. O gate real vive no backend
// (Edge Function ai-insights); aqui só decidimos se mostramos a UI da IA.
export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id
  const [role, setRole] = useState<Profile['role'] | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Tabela ainda não criada (profiles.sql não rodou) ou outra falha:
          // segue sem perfil — sem acesso à IA.
          console.error('loadProfile:', error)
        }
        setRole((data?.role as Profile['role']) ?? null)
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  return { loading, canUseAi: role === 'admin' || role === 'tester' }
}
