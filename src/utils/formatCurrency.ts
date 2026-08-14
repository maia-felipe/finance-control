import { currentLocale } from '../i18n'
import type { CurrencyCode } from '../types'

// Intl.NumberFormat é caro de instanciar; a mesma combinação
// locale+moeda+precisão é reusada centenas de vezes por render de lista.
const cache = new Map<string, Intl.NumberFormat>()

function formatter(currency: CurrencyCode, fractionDigits?: number): Intl.NumberFormat {
  const locale = currentLocale()
  const key = `${locale}|${currency}|${fractionDigits ?? ''}`
  let fmt = cache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...(fractionDigits !== undefined
        ? { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }
        : {}),
    })
    cache.set(key, fmt)
  }
  return fmt
}

/** Formata um valor na moeda informada, no idioma ativo. */
export const formatMoney = (value: number, currency: CurrencyCode) =>
  formatter(currency).format(value)

/** Preço unitário (ex.: cotação de câmbio) com 4 casas decimais. */
export const formatUnitPrice = (value: number, currency: CurrencyCode) =>
  formatter(currency, 4).format(value)

/** Só o símbolo da moeda ("R$", "$", "€") — para rótulos e prefixos de input. */
export const currencySymbol = (currency: CurrencyCode): string => {
  const part = formatter(currency)
    .formatToParts(0)
    .find(p => p.type === 'currency')
  return part?.value ?? currency
}

/**
 * Lê um valor digitado pelo usuário. Aceita tanto vírgula quanto ponto como
 * separador decimal, porque o teclado do usuário não muda junto com o idioma
 * do app. Preserva o sinal negativo.
 */
export const parseCurrencyInput = (value: string): number => {
  const cleaned = value.replace(/[^\d,.-]/g, '')
  // Se há os dois separadores, o último é o decimal e o outro é de milhar.
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalized: string
  if (lastComma > -1 && lastDot > -1) {
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '')
  } else {
    normalized = cleaned.replace(',', '.')
  }
  return parseFloat(normalized) || 0
}
