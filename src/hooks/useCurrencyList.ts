import { useEffect, useState } from 'react'
import { fetchCurrencies } from '../lib/fx'
import type { CurrencyInfo } from '../lib/fx'
import type { CurrencyCode } from '../types'

// Moedas fixadas no topo do seletor — cobrem o uso diário sem rolagem.
export const PINNED_CURRENCIES: CurrencyCode[] = [
  'BRL', 'USD', 'EUR', 'GBP', 'CAD', 'MXN', 'ARS', 'CLP', 'JPY', 'CHF', 'AUD', 'CNY',
]

// Usado enquanto a lista completa não chegou (ou se a API falhar): o seletor
// nunca fica vazio.
const FALLBACK: CurrencyInfo[] = PINNED_CURRENCIES.map(code => ({ code, name: code, symbol: code }))

let cachedList: CurrencyInfo[] | null = null

/** Lista de moedas suportadas, carregada uma vez por sessão. */
export function useCurrencyList(): CurrencyInfo[] {
  const [list, setList] = useState<CurrencyInfo[]>(cachedList ?? FALLBACK)

  useEffect(() => {
    if (cachedList) return
    let cancelled = false
    fetchCurrencies()
      .then(fetched => {
        cachedList = fetched
        if (!cancelled) setList(fetched)
      })
      .catch(err => console.error('fx currencies:', err))
    return () => { cancelled = true }
  }, [])

  return list
}
