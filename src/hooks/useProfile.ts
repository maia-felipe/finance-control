import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../lib/toast'

export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Tabela ainda não criada (profiles.sql não rodou) ou outra falha:
          // segue sem perfil — o app trata como plano free.
          console.error('loadProfile:', error)
        }
        setProfile(data ? {
          plan: data.plan,
          role: data.role,
          trialEndsAt: data.trial_ends_at,
          stripeCustomerId: data.stripe_customer_id ?? undefined,
        } : null)
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  // Plano efetivo: admin/tester têm carta branca; trial vale até expirar.
  const isPremium = profile != null && (
    profile.role === 'admin' ||
    profile.role === 'tester' ||
    profile.plan === 'premium' ||
    (profile.plan === 'trial' && new Date(profile.trialEndsAt) > new Date())
  )

  const trialDaysLeft = profile?.plan === 'trial'
    ? Math.max(0, Math.ceil((new Date(profile.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null

  // Redireciona para o Stripe Checkout (Edge Function stripe-checkout)
  const startCheckout = async () => {
    const { data, error } = await supabase.functions.invoke('stripe-checkout')
    if (error || !data?.url) {
      console.error('startCheckout:', error)
      toast.error('Não foi possível iniciar o pagamento. Tente novamente.')
      return
    }
    window.location.href = data.url
  }

  return { profile, loading, isPremium, trialDaysLeft, startCheckout }
}
