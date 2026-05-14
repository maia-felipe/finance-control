import { useMemo, useState } from 'react'
import { format, subMonths } from 'date-fns'
import type { WishlistItem, Transaction } from '../../types'
import { useBudget } from '../../hooks/useBudget'
import { formatCurrency } from '../../utils/formatCurrency'
import { currentMonth } from '../../utils/formatDate'

interface WishlistInsightsProps {
  items: WishlistItem[]
  transactions: Transaction[]
}

const STORAGE_KEY = 'fc_wishlist_insights_collapsed'
const MONTHS_BACK = 6
const MIN_MONTHS_FOR_HISTORY = 3

/**
 * Saldo médio mensal: média do delta (receitas - gastos - investimentos)
 * dos últimos N meses **anteriores ao mês corrente** (mês corrente é incompleto).
 * Só conta meses que têm pelo menos uma transação.
 */
function calcAverageMonthlyBalance(transactions: Transaction[]): { avg: number; monthsCounted: number } {
  const now = new Date()
  const targetMonths: string[] = []
  for (let i = MONTHS_BACK; i >= 1; i--) {
    targetMonths.push(format(subMonths(now, i), 'yyyy-MM'))
  }

  const monthlyTotals: Record<string, number> = {}
  const monthsWithData = new Set<string>()

  transactions.forEach(t => {
    const m = t.date.slice(0, 7)
    if (!targetMonths.includes(m)) return
    monthsWithData.add(m)
    const sign = t.type === 'income' ? 1 : -1
    monthlyTotals[m] = (monthlyTotals[m] ?? 0) + sign * t.amount
  })

  if (monthsWithData.size === 0) return { avg: 0, monthsCounted: 0 }
  const sum = Array.from(monthsWithData).reduce((s, m) => s + (monthlyTotals[m] ?? 0), 0)
  return { avg: sum / monthsWithData.size, monthsCounted: monthsWithData.size }
}

/**
 * Parcelas (transações com installmentGroupId) com data no mês corrente.
 */
function calcInstallmentsThisMonth(transactions: Transaction[]): { total: number; count: number } {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const installments = transactions.filter(
    t => t.installmentGroupId && t.date.startsWith(currentMonth)
  )
  return {
    total: installments.reduce((s, t) => s + t.amount, 0),
    count: installments.length,
  }
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-36">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function WishlistInsights({ items, transactions }: WishlistInsightsProps) {
  const { getBudget } = useBudget()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  }

  const totalDesired = useMemo(
    () => items.filter(i => !i.purchased).reduce((s, i) => s + i.price, 0),
    [items]
  )
  const totalPurchased = useMemo(
    () => items.filter(i => i.purchased).reduce((s, i) => s + i.price, 0),
    [items]
  )
  const desiredCount = items.filter(i => !i.purchased).length

  const { avg: avgMonthly, monthsCounted } = useMemo(
    () => calcAverageMonthlyBalance(transactions),
    [transactions]
  )
  const installments = useMemo(() => calcInstallmentsThisMonth(transactions), [transactions])

  // Fallback quando não há histórico suficiente: receita do mês atual − orçamento planejado
  const { effectiveMonthly, usingFallback, fallbackSub } = useMemo(() => {
    if (monthsCounted >= MIN_MONTHS_FOR_HISTORY) {
      return {
        effectiveMonthly: avgMonthly,
        usingFallback: false,
        fallbackSub: `média de ${monthsCounted} mês(es) anteriores`,
      }
    }
    const thisMonth = currentMonth()
    const budget = getBudget(thisMonth)
    const currentIncome = transactions
      .filter(t => t.type === 'income' && t.date.startsWith(thisMonth))
      .reduce((s, t) => s + t.amount, 0)
    const estimated = currentIncome - budget.totalLimit
    return {
      effectiveMonthly: estimated,
      usingFallback: true,
      fallbackSub: budget.totalLimit > 0
        ? 'estimativa: receita − orçamento planejado'
        : 'estimativa: receita do mês (sem orçamento definido)',
    }
  }, [monthsCounted, avgMonthly, transactions, getBudget])

  const monthsToBuyAll =
    effectiveMonthly > 0 && totalDesired > 0 ? Math.ceil(totalDesired / effectiveMonthly) : null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 mb-6 overflow-hidden">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50 transition"
        aria-expanded={!collapsed}
      >
        <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          💡 Insights
        </span>
        <span className="text-xs text-slate-400">{collapsed ? '▼ Expandir' : '▲ Colapsar'}</span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 pt-1 flex flex-col gap-4">
          {/* Linha 1: estado da wishlist */}
          <div className="flex flex-wrap gap-4 border-b border-slate-50 pb-4">
            <Metric
              label="Total desejado"
              value={formatCurrency(totalDesired)}
              sub={`${desiredCount} item(s) não comprados`}
            />
            {totalPurchased > 0 && (
              <Metric
                label="Já adquirido"
                value={formatCurrency(totalPurchased)}
                sub={`${items.length - desiredCount} item(s)`}
              />
            )}
          </div>

          {/* Linha 2: análise financeira */}
          <div className="flex flex-wrap gap-4">
            <Metric
              label={usingFallback ? 'Poupança estimada/mês' : 'Saldo médio mensal'}
              value={effectiveMonthly !== 0 ? formatCurrency(effectiveMonthly) : '—'}
              sub={fallbackSub}
            />
            <Metric
              label="Parcelas este mês"
              value={installments.count > 0 ? formatCurrency(installments.total) : '—'}
              sub={
                installments.count > 0
                  ? `${installments.count} parcela(s) comprometida(s)`
                  : 'nenhuma parcela ativa'
              }
            />
            <Metric
              label="Pra comprar tudo"
              value={monthsToBuyAll !== null ? `~${monthsToBuyAll} meses` : '—'}
              sub={
                monthsToBuyAll !== null
                  ? usingFallback ? 'com poupança estimada' : 'com saldo médio histórico'
                  : effectiveMonthly <= 0
                    ? 'poupança precisa ser positiva'
                    : 'sem itens desejados'
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
