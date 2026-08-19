import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { useAuth } from '../contexts/AuthContext'
<<<<<<< HEAD
=======
import { toast } from '../lib/toast'
import i18n from '../i18n'

interface ProfileState {
  profile: Profile | null
  // Plano efetivo: admin/tester têm carta branca; trial vale até expirar.
  isPremium: boolean
  trialDaysLeft: number | null
}

const EMPTY: ProfileState = { profile: null, isPremium: false, trialDaysLeft: null }

function toProfileState(data: Record<string, unknown> | null): ProfileState {
  if (!data) return EMPTY
  const profile: Profile = {
    plan: data.plan as Profile['plan'],
    role: data.role as Profile['role'],
    trialEndsAt: data.trial_ends_at as string,
    stripeCustomerId: (data.stripe_customer_id as string | null) ?? undefined,
  }
  const trialMsLeft = new Date(profile.trialEndsAt).getTime() - Date.now()
  const isPremium =
    profile.role === 'admin' ||
    profile.role === 'tester' ||
    profile.plan === 'premium' ||
    (profile.plan === 'trial' && trialMsLeft > 0)
  const trialDaysLeft = profile.plan === 'trial'
    ? Math.max(0, Math.ceil(trialMsLeft / 86_400_000))
    : null
  return { profile, isPremium, trialDaysLeft }
}
>>>>>>> dev

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

<<<<<<< HEAD
  return { loading, canUseAi: role === 'admin' || role === 'tester' }
=======
  // Redireciona para o Stripe Checkout (Edge Function stripe-checkout)
  const startCheckout = async () => {
    const { data, error } = await supabase.functions.invoke('stripe-checkout')
    if (error || !data?.url) {
      console.error('startCheckout:', error)
      toast.error(i18n.t('errors.startCheckout'))
      return
    }
    window.location.href = data.url
  }

  return { ...state, loading, startCheckout }
>>>>>>> dev
}
