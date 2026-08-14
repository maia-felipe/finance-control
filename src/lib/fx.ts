// Conversão de moedas — busca, cache e aritmética.
//
// Fonte: Frankfurter (https://frankfurter.dev), sem API key e sem conta.
// Usamos a v2 porque ela repete a última cotação em fins de semana e feriados;
// a v1 simplesmente omite esses dias, o que obrigaria a preencher buracos aqui.
//
// Todas as cotações são guardadas contra uma base única (USD), em "unidades da
// moeda por 1 USD". Qualquer par se deriva exatamente a partir disso:
//     A → B  =  valor / rate[A] * rate[B]
// Assim uma única série por moeda serve para todas as combinações.

import type { CurrencyCode } from '../types'

const API = 'https://api.frankfurter.dev/v2'

export const BASE_CURRENCY: CurrencyCode = 'USD'

/** `{ 'yyyy-MM-dd': { BRL: 5.17, EUR: 0.86, … } }`, unidades por 1 USD. */
export type RateTable = Record<string, Record<CurrencyCode, number>>

export interface CurrencyInfo {
  code: CurrencyCode
  name: string
  symbol: string
}

const RATES_STORAGE_KEY = 'fc_fx_rates'
const CURRENCIES_STORAGE_KEY = 'fc_fx_currencies'
const LATEST_FETCHED_AT_KEY = 'fc_fx_latest_at'

// Cotações de datas passadas nunca mudam, então valem para sempre. A do dia
// corrente é revalidada algumas vezes ao dia.
const LATEST_TTL_MS = 6 * 60 * 60 * 1000

// ----------------------------------------------------------------------------
// Cache em localStorage
// ----------------------------------------------------------------------------

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota estourada ou storage indisponível: seguimos sem cache */ }
}

export function loadCachedRates(): RateTable {
  return readJSON<RateTable>(RATES_STORAGE_KEY) ?? {}
}

export function saveCachedRates(table: RateTable) {
  writeJSON(RATES_STORAGE_KEY, table)
}

export function latestIsStale(): boolean {
  const at = readJSON<number>(LATEST_FETCHED_AT_KEY)
  return at === null || Date.now() - at > LATEST_TTL_MS
}

function markLatestFetched() {
  writeJSON(LATEST_FETCHED_AT_KEY, Date.now())
}

// ----------------------------------------------------------------------------
// Busca
// ----------------------------------------------------------------------------

interface RateRow {
  date: string
  base: string
  quote: string
  rate: number
}

function foldRows(rows: RateRow[]): RateTable {
  const table: RateTable = {}
  for (const row of rows) {
    ;(table[row.date] ??= {})[row.quote] = row.rate
  }
  return table
}

/**
 * Série diária de `codes` (contra USD) entre duas datas, inclusive.
 * Lança se a API falhar — quem chama decide como degradar.
 */
export async function fetchRateRange(
  codes: CurrencyCode[],
  from: string,
  to: string,
): Promise<RateTable> {
  const quotes = codes.filter(c => c !== BASE_CURRENCY)
  if (quotes.length === 0) return {}
  const url = `${API}/rates?base=${BASE_CURRENCY}&quotes=${quotes.join(',')}&from=${from}&to=${to}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fx: ${res.status} ${res.statusText}`)
  return foldRows((await res.json()) as RateRow[])
}

/** Cotação mais recente publicada, para valores "de hoje" (investimentos). */
export async function fetchLatestRates(codes: CurrencyCode[]): Promise<RateTable> {
  const quotes = codes.filter(c => c !== BASE_CURRENCY)
  if (quotes.length === 0) return {}
  const url = `${API}/rates?base=${BASE_CURRENCY}&quotes=${quotes.join(',')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fx: ${res.status} ${res.statusText}`)
  const table = foldRows((await res.json()) as RateRow[])
  markLatestFetched()
  return table
}

/** Lista completa de moedas suportadas, para o seletor. Cacheada localmente. */
export async function fetchCurrencies(): Promise<CurrencyInfo[]> {
  const cached = readJSON<CurrencyInfo[]>(CURRENCIES_STORAGE_KEY)
  if (cached && cached.length > 0) return cached

  const res = await fetch(`${API}/currencies`)
  if (!res.ok) throw new Error(`fx: ${res.status} ${res.statusText}`)
  const raw = (await res.json()) as { iso_code: string; name: string; symbol: string }[]
  const list = raw
    .filter(c => c.iso_code?.length === 3)
    .map(c => ({ code: c.iso_code, name: c.name, symbol: c.symbol }))
  writeJSON(CURRENCIES_STORAGE_KEY, list)
  return list
}

export function mergeTables(a: RateTable, b: RateTable): RateTable {
  const merged: RateTable = { ...a }
  for (const [date, rates] of Object.entries(b)) {
    merged[date] = { ...merged[date], ...rates }
  }
  return merged
}

// ----------------------------------------------------------------------------
// Conversão
// ----------------------------------------------------------------------------

/**
 * Cotações válidas para `date`: a linha exata, senão a data anterior mais
 * próxima (a v2 já cobre fim de semana, isto pega lacunas de borda), senão a
 * mais recente que existir. `sortedDates` precisa estar em ordem crescente.
 */
function ratesForDate(
  table: RateTable,
  sortedDates: string[],
  date: string,
): Record<CurrencyCode, number> | null {
  if (sortedDates.length === 0) return null
  const exact = table[date]
  if (exact) return exact

  // Busca binária pela última data <= date.
  let lo = 0
  let hi = sortedDates.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (sortedDates[mid] <= date) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  // Data anterior a tudo que temos: usa a mais antiga disponível.
  const key = found >= 0 ? sortedDates[found] : sortedDates[0]
  return table[key] ?? null
}

export function sortedDatesOf(table: RateTable): string[] {
  return Object.keys(table).sort()
}

/**
 * Converte entre moedas usando a cotação de `date`.
 * Retorna `null` quando não há dados suficientes — quem chama deve exibir o
 * valor original em vez de inventar um número.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  date: string,
  table: RateTable,
  sortedDates: string[],
): number | null {
  if (from === to) return amount

  const rates = ratesForDate(table, sortedDates, date)
  if (!rates) return null

  // A base vale 1 por definição e não vem na resposta da API.
  const fromRate = from === BASE_CURRENCY ? 1 : rates[from]
  const toRate = to === BASE_CURRENCY ? 1 : rates[to]
  if (!fromRate || !toRate) return null

  return (amount / fromRate) * toRate
}
