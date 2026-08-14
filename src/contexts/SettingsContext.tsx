import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { persist } from '../lib/persist'
import { toast } from '../lib/toast'
import i18n, { changeLocale, initialLocale, DEFAULT_LOCALE } from '../i18n'
import type { Locale } from '../i18n'
import type { CurrencyCode } from '../types'

const CURRENCY_STORAGE_KEY = 'fc_currency'
export const DEFAULT_CURRENCY: CurrencyCode = 'USD'

interface SettingsContextValue {
  locale: Locale
  preferredCurrency: CurrencyCode
  /** Moedas que o usuário efetivamente usa — define quais séries de câmbio buscar. */
  activeCurrencies: CurrencyCode[]
  loading: boolean
  setLocale: (locale: Locale) => void
  setPreferredCurrency: (currency: CurrencyCode) => void
  /** Registra uma moeda recém-usada num formulário, se ainda não estiver na lista. */
  trackCurrency: (currency: CurrencyCode) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function readStoredCurrency(): CurrencyCode {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (stored && stored.length === 3) return stored
  } catch { /* localStorage indisponível */ }
  return DEFAULT_CURRENCY
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id

  // Estado inicial vem do localStorage para que idioma e moeda apliquem antes
  // do primeiro round-trip com o Supabase (que é a fonte autoritativa).
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [preferredCurrency, setPreferredCurrencyState] = useState<CurrencyCode>(readStoredCurrency)
  const [activeCurrencies, setActiveCurrencies] = useState<CurrencyCode[]>([])
  const [fetched, setFetched] = useState(false)
  // Sem usuário não há nada a buscar — derivamos em vez de chamar setState no
  // efeito só para desligar o spinner.
  const loading = !!userId && !fetched

  const reload = useCallback(() => {
    if (!userId) return
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('loadSettings:', error)
          toast.error(i18n.t('errors.loadSettings'))
        }
        if (data) {
          const remoteLocale = data.locale as Locale
          const remoteCurrency = data.preferred_currency as CurrencyCode
          setLocaleState(remoteLocale)
          void changeLocale(remoteLocale)
          setPreferredCurrencyState(remoteCurrency)
          localStorage.setItem(CURRENCY_STORAGE_KEY, remoteCurrency)
          setActiveCurrencies((data.active_currencies as CurrencyCode[] | null) ?? [])
        }
        setFetched(true)
      })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    reload()
  }, [reload, userId])

  // O usuário pode não ter linha em user_settings se a conta é anterior ao
  // backfill; o upsert cobre tanto criação quanto atualização.
  const save = useCallback((patch: Record<string, unknown>) => {
    if (!userId) return
    persist(
      i18n.t('errors.saveSettings'),
      supabase
        .from('user_settings')
        .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
      reload,
    )
  }, [userId, reload])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    void changeLocale(next)
    save({ locale: next })
  }, [save])

  const setPreferredCurrency = useCallback((next: CurrencyCode) => {
    setPreferredCurrencyState(next)
    localStorage.setItem(CURRENCY_STORAGE_KEY, next)
    setActiveCurrencies(prev => {
      if (prev.includes(next)) {
        save({ preferred_currency: next })
        return prev
      }
      const merged = [...prev, next]
      save({ preferred_currency: next, active_currencies: merged })
      return merged
    })
  }, [save])

  const trackCurrency = useCallback((currency: CurrencyCode) => {
    setActiveCurrencies(prev => {
      if (prev.includes(currency)) return prev
      const merged = [...prev, currency]
      save({ active_currencies: merged })
      return merged
    })
  }, [save])

  return (
    <SettingsContext.Provider
      value={{ locale, preferredCurrency, activeCurrencies, loading, setLocale, setPreferredCurrency, trackCurrency }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export { DEFAULT_LOCALE }
