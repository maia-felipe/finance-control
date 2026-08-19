import { Select } from './Select'
import { useCurrencyList, PINNED_CURRENCIES } from '../../hooks/useCurrencyList'
import { useSettings } from '../../contexts/SettingsContext'
import type { CurrencyCode } from '../../types'

interface CurrencySelectProps {
  value: CurrencyCode
  onChange: (currency: CurrencyCode) => void
  label?: string
  className?: string
  /** Compacto: só o código, para ficar ao lado de um campo de valor. */
  compact?: boolean
}

/**
 * Seletor de moeda. Usa um `<select>` nativo de propósito: é pesquisável ao
 * digitar, funciona bem no mobile e não exige código de popover.
 */
export function CurrencySelect({ value, onChange, label, className = '', compact }: CurrencySelectProps) {
  const list = useCurrencyList()
  const { activeCurrencies, preferredCurrency } = useSettings()

  // Topo: as que o usuário realmente usa e as fixadas. Abaixo: todo o resto.
  const top = [...new Set([preferredCurrency, ...activeCurrencies, ...PINNED_CURRENCIES, value])]
  const topSet = new Set(top)
  const rest = list.filter(c => !topSet.has(c.code))
  const byCode = new Map(list.map(c => [c.code, c]))

  const optionLabel = (code: CurrencyCode) => {
    if (compact) return code
    const info = byCode.get(code)
    return info && info.name !== code ? `${code} — ${info.name}` : code
  }

  return (
    <Select
      label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={className}
    >
      {top.map(code => (
        <option key={code} value={code}>{optionLabel(code)}</option>
      ))}
      {rest.length > 0 && (
        <optgroup label="───">
          {rest.map(c => (
            <option key={c.code} value={c.code}>{compact ? c.code : `${c.code} — ${c.name}`}</option>
          ))}
        </optgroup>
      )}
    </Select>
  )
}

/**
 * Campo de valor + moeda lado a lado. A moeda começa na preferida do usuário,
 * mas pode ser trocada por lançamento (comprou em euros morando nos EUA).
 */
interface MoneyFieldProps {
  label: string
  amount: string
  currency: CurrencyCode
  onAmountChange: (value: string) => void
  onCurrencyChange: (currency: CurrencyCode) => void
  error?: string
  placeholder?: string
  autoFocus?: boolean
}

export function MoneyField({
  label, amount, currency, onAmountChange, onCurrencyChange, error, placeholder = '0.00', autoFocus,
}: MoneyFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-content-2">{label}</label>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`flex-1 min-w-0 border border-border bg-surface text-content placeholder:text-content-3 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition ${error ? 'border-danger' : ''}`}
        />
        <CurrencySelect value={currency} onChange={onCurrencyChange} compact className="w-24 flex-shrink-0" />
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
