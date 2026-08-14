import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { format, subMonths } from 'date-fns'
import {
  convert as convertRates, fetchLatestRates, fetchRateRange, loadCachedRates,
  mergeTables, saveCachedRates, sortedDatesOf, latestIsStale,
} from '../lib/fx'
import type { RateTable } from '../lib/fx'
import { useSettings } from './SettingsContext'
import { todayISO } from '../utils/formatDate'
import type { CurrencyCode } from '../types'

// Janela padrão: o maior período que os Relatórios conseguem exibir. Datas mais
// antigas que isso são cobertas sob demanda via ensureRange().
const DEFAULT_WINDOW_MONTHS = 24

interface FxContextValue {
  /**
   * Converte para a moeda preferida usando a cotação de `date`.
   * Retorna `null` quando não há cotação — quem chama deve mostrar o valor
   * original em vez de um número inventado.
   */
  toPreferred: (amount: number, currency: CurrencyCode, date: string) => number | null
  /** Converte usando a cotação mais recente disponível (valores "de hoje"). */
  toPreferredToday: (amount: number, currency: CurrencyCode) => number | null
  /**
   * Converte entre duas moedas quaisquer pela cotação mais recente — nem sempre
   * a moeda preferida entra na conta. Usado para marcar posições de câmbio a
   * mercado (quantidade na moeda mantida → moeda da posição).
   */
  convertBetweenToday: (amount: number, from: CurrencyCode, to: CurrencyCode) => number | null
  /** Idem, mas pela cotação de uma data (ex.: quanto de moeda um aporte comprou). */
  convertBetweenOn: (amount: number, from: CurrencyCode, to: CurrencyCode, date: string) => number | null
  /** Data da cotação mais recente em cache — o "atualizado em" real. */
  latestRateDate: string
  /** Garante que a série cubra até `date` no passado. Idempotente. */
  ensureRange: (date: string) => void
  /** false quando a API falhou e não há cache — a UI cai para os valores nativos. */
  available: boolean
  loading: boolean
}

const FxContext = createContext<FxContextValue | null>(null)

export function FxProvider({ children }: { children: ReactNode }) {
  const { preferredCurrency, activeCurrencies } = useSettings()

  const [table, setTable] = useState<RateTable>(loadCachedRates)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [minDate, setMinDate] = useState(() =>
    format(subMonths(new Date(), DEFAULT_WINDOW_MONTHS), 'yyyy-MM-dd'),
  )

  // Moedas que precisam de série: as que o usuário usa, mais a preferida.
  const codes = useMemo(() => {
    const set = new Set<CurrencyCode>(activeCurrencies)
    set.add(preferredCurrency)
    return [...set].sort()
  }, [activeCurrencies, preferredCurrency])

  // Evita refetch quando nada relevante mudou (o efeito depende de arrays).
  const lastFetch = useRef('')

  useEffect(() => {
    // Só a moeda base? Nada a buscar — a conversão é identidade.
    const needed = codes.filter(c => c !== 'USD')
    if (needed.length === 0) return

    const to = todayISO()
    const key = `${codes.join(',')}|${minDate}|${to}`
    if (lastFetch.current === key && !latestIsStale()) return
    lastFetch.current = key

    let cancelled = false
    setLoading(true)

    Promise.all([fetchRateRange(codes, minDate, to), fetchLatestRates(codes)])
      .then(([range, latest]) => {
        if (cancelled) return
        setTable(prev => {
          const merged = mergeTables(mergeTables(prev, range), latest)
          saveCachedRates(merged)
          return merged
        })
        setFailed(false)
      })
      .catch(err => {
        if (cancelled) return
        console.error('fx:', err)
        // Com cache local ainda dá para converter; sem ele, a UI mostra os
        // valores nativos.
        setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [codes, minDate])

  const sortedDates = useMemo(() => sortedDatesOf(table), [table])
  const latestDate = sortedDates[sortedDates.length - 1] ?? todayISO()

  const ensureRange = useCallback((date: string) => {
    setMinDate(prev => (date < prev ? date : prev))
  }, [])

  const toPreferred = useCallback(
    (amount: number, currency: CurrencyCode, date: string) =>
      convertRates(amount, currency, preferredCurrency, date, table, sortedDates),
    [preferredCurrency, table, sortedDates],
  )

  const toPreferredToday = useCallback(
    (amount: number, currency: CurrencyCode) =>
      convertRates(amount, currency, preferredCurrency, latestDate, table, sortedDates),
    [preferredCurrency, table, sortedDates, latestDate],
  )

  const convertBetweenToday = useCallback(
    (amount: number, from: CurrencyCode, to: CurrencyCode) =>
      convertRates(amount, from, to, latestDate, table, sortedDates),
    [table, sortedDates, latestDate],
  )

  const convertBetweenOn = useCallback(
    (amount: number, from: CurrencyCode, to: CurrencyCode, date: string) =>
      convertRates(amount, from, to, date, table, sortedDates),
    [table, sortedDates],
  )

  const available = !failed || sortedDates.length > 0

  return (
    <FxContext.Provider value={{
      toPreferred, toPreferredToday, convertBetweenToday, convertBetweenOn, latestRateDate: latestDate,
      ensureRange, available, loading,
    }}>
      {children}
    </FxContext.Provider>
  )
}

export function useFx() {
  const ctx = useContext(FxContext)
  if (!ctx) throw new Error('useFx must be used within FxProvider')
  return ctx
}

/**
 * Estende a janela de cotações para cobrir a transação mais antiga carregada.
 * Chamado pelas páginas que agregam histórico (Dashboard, Relatórios).
 */
export function useFxRange(dates: string[]) {
  const { ensureRange } = useFx()
  const earliest = dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null
  useEffect(() => {
    if (earliest) ensureRange(earliest)
  }, [earliest, ensureRange])
}
