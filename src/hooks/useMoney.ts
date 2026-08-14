import { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { useFx } from '../contexts/FxContext'
import { formatMoney, formatUnitPrice, currencySymbol } from '../utils/formatCurrency'
import type { CurrencyCode } from '../types'

/**
 * Ponte entre câmbio e formatação — o que quase toda tela precisa.
 *
 * Quando não há cotação disponível, `convert` devolve o valor original em vez
 * de um número inventado. Isso mistura moedas num total, mas é o mesmo
 * comportamento de antes do multi-moeda (tudo BRL) e mantém a tela utilizável
 * offline; `available` permite avisar o usuário.
 */
export function useMoney() {
  const { preferredCurrency } = useSettings()
  const {
    toPreferred, toPreferredToday, convertBetweenToday, convertBetweenOn, latestRateDate, available,
  } = useFx()

  return useMemo(() => ({
    preferredCurrency,
    available,
    latestRateDate,

    /** Converte entre duas moedas quaisquer pela cotação de hoje. */
    convertBetweenToday: (amount: number, from: CurrencyCode, to: CurrencyCode) =>
      convertBetweenToday(amount, from, to),

    /** Converte entre duas moedas quaisquer pela cotação de uma data. */
    convertBetweenOn: (amount: number, from: CurrencyCode, to: CurrencyCode, date: string) =>
      convertBetweenOn(amount, from, to, date),

    /** Converte pela cotação da data do lançamento (valor histórico, imutável). */
    convert: (amount: number, currency: CurrencyCode, date: string) =>
      toPreferred(amount, currency, date) ?? amount,

    /** Converte pela cotação mais recente (valores de mercado "de hoje"). */
    convertToday: (amount: number, currency: CurrencyCode) =>
      toPreferredToday(amount, currency) ?? amount,

    /** Formata um valor que já está na moeda preferida. */
    format: (amount: number) => formatMoney(amount, preferredCurrency),

    /** Formata na moeda informada, sem converter. */
    formatIn: (amount: number, currency: CurrencyCode) => formatMoney(amount, currency),

    /** Preço unitário (cotação) com 4 casas. */
    formatUnit: (amount: number, currency: CurrencyCode) => formatUnitPrice(amount, currency),

    /** Símbolo da moeda preferida, para rótulos e prefixos de input. */
    symbol: currencySymbol(preferredCurrency),
  }), [
    preferredCurrency, toPreferred, toPreferredToday,
    convertBetweenToday, convertBetweenOn, latestRateDate, available,
  ])
}
