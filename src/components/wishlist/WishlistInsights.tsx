import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, subMonths } from 'date-fns'
import { Lightbulb, Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { WishlistItem } from '../../types'
import { useBudget } from '../../hooks/useBudget'
import type { ConvertedTransaction } from '../../hooks/useTransactions'
import { useMoney } from '../../hooks/useMoney'
import { currentMonth } from '../../utils/formatDate'

interface WishlistInsightsProps {
  items: WishlistItem[]
  /** Já convertidas para a moeda preferida — as médias só fazem sentido numa moeda só. */
  transactions: ConvertedTransaction[]
  availableBalance: number
}

const STORAGE_KEY = 'fc_wishlist_insights_collapsed'
const MONTHS_BACK = 6
const MIN_MONTHS_FOR_HISTORY = 3

/**
 * Saldo médio mensal: média do delta (receitas - gastos - investimentos)
 * dos últimos N meses **anteriores ao mês corrente** (mês corrente é incompleto).
 * Só conta meses que têm pelo menos uma transação.
 */
function calcAverageMonthlyBalance(transactions: ConvertedTransaction[]): { avg: number; monthsCounted: number } {
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
    monthlyTotals[m] = (monthlyTotals[m] ?? 0) + sign * t.convertedAmount
  })

  if (monthsWithData.size === 0) return { avg: 0, monthsCounted: 0 }
  const sum = Array.from(monthsWithData).reduce((s, m) => s + (monthlyTotals[m] ?? 0), 0)
  return { avg: sum / monthsWithData.size, monthsCounted: monthsWithData.size }
}

/**
 * Parcelas (transações com installmentGroupId) com data no mês corrente.
 */
function calcInstallmentsThisMonth(transactions: ConvertedTransaction[]): { total: number; count: number } {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const installments = transactions.filter(
    t => t.installmentGroupId && t.date.startsWith(currentMonth)
  )
  return {
    total: installments.reduce((s, t) => s + t.convertedAmount, 0),
    count: installments.length,
  }
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-36">
      <p className="text-xs text-content-2 mb-1">{label}</p>
      <p className="text-lg font-bold text-content">{value}</p>
      {sub && <p className="text-xs text-content-3 mt-0.5">{sub}</p>}
    </div>
  )
}

export function WishlistInsights({ items, transactions, availableBalance }: WishlistInsightsProps) {
  const { getBudget } = useBudget()
  const { t } = useTranslation()
  const money = useMoney()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  }

  // Preços são prospectivos (ainda não comprou) → cotação de hoje.
  const totalDesired = useMemo(
    () => items.filter(i => !i.purchased).reduce((sum, i) => sum + money.convertToday(i.price, i.currency), 0),
    [items, money]
  )
  const totalPurchased = useMemo(
    () => items.filter(i => i.purchased).reduce((sum, i) => sum + money.convertToday(i.price, i.currency), 0),
    [items, money]
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
        fallbackSub: t('wishlistInsights.avgOfMonths', { count: monthsCounted }),
      }
    }
    const thisMonth = currentMonth()
    const budget = getBudget(thisMonth)
    const currentIncome = transactions
      .filter(t => t.type === 'income' && t.date.startsWith(thisMonth))
      .reduce((s, t) => s + t.convertedAmount, 0)
    const estimated = currentIncome - budget.totalLimit
    return {
      effectiveMonthly: estimated,
      usingFallback: true,
      fallbackSub: budget.totalLimit > 0
        ? t('wishlistInsights.estimateIncomeMinusBudget')
        : t('wishlistInsights.estimateIncomeOnly'),
    }
  }, [monthsCounted, avgMonthly, transactions, getBudget, t])

  const monthsToBuyAll =
    effectiveMonthly > 0 && totalDesired > 0 ? Math.ceil(totalDesired / effectiveMonthly) : null

  // Greedy: quais itens cabem no saldo disponível deste mês, ordenados por prioridade desc + preço asc
  const fitsThisMonth = useMemo(() => {
    const unpurchased = items
      .filter(i => !i.purchased)
      .slice()
      .sort((a, b) => {
        const aMonthly = money.convertToday(a.price, a.currency) / (a.plannedInstallments ?? 1)
        const bMonthly = money.convertToday(b.price, b.currency) / (b.plannedInstallments ?? 1)
        return b.priority - a.priority || aMonthly - bMonthly
      })
    let remaining = availableBalance
    const fitting: WishlistItem[] = []
    for (const item of unpurchased) {
      const monthlyCost = money.convertToday(item.price, item.currency) / (item.plannedInstallments ?? 1)
      if (monthlyCost <= remaining) {
        fitting.push(item)
        remaining -= monthlyCost
      }
    }
    return { fitting, totalFit: availableBalance - remaining }
  }, [items, availableBalance, money])

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle mb-6 overflow-hidden">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-surface-2 transition"
        aria-expanded={!collapsed}
      >
        <span className="text-sm font-semibold text-content flex items-center gap-2">
          <Lightbulb size={15} className="text-warning" /> {t('wishlistInsights.title')}
        </span>
        <span className="text-xs text-content-3 flex items-center gap-1">
          {collapsed
            ? <><ChevronDown size={13} /> {t('wishlistInsights.expand')}</>
            : <><ChevronUp size={13} /> {t('wishlistInsights.collapse')}</>}
        </span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 pt-1 flex flex-col gap-4">
          {/* Linha 1: estado da wishlist */}
          <div className="flex flex-wrap gap-4 border-b border-border-subtle pb-4">
            <Metric
              label={t('wishlistInsights.totalWanted')}
              value={money.format(totalDesired)}
              sub={t('wishlistInsights.notBought', { count: desiredCount })}
            />
            {totalPurchased > 0 && (
              <Metric
                label={t('wishlistInsights.alreadyBought')}
                value={money.format(totalPurchased)}
                sub={t('wishlistInsights.itemCount', { count: items.length - desiredCount })}
              />
            )}
          </div>

          {/* Linha 2: análise financeira */}
          <div className="flex flex-wrap gap-4">
            <Metric
              label={usingFallback ? t('wishlistInsights.estimatedSavings') : t('wishlistInsights.averageBalance')}
              value={effectiveMonthly !== 0 ? money.format(effectiveMonthly) : t('common.none')}
              sub={fallbackSub}
            />
            <Metric
              label={t('wishlistInsights.installmentsThisMonth')}
              value={installments.count > 0 ? money.format(installments.total) : t('common.none')}
              sub={
                installments.count > 0
                  ? t('wishlistInsights.committed', { count: installments.count })
                  : t('wishlistInsights.noActiveInstallments')
              }
            />
            <Metric
              label={t('wishlistInsights.toBuyEverything')}
              value={monthsToBuyAll !== null ? t('wishlistInsights.monthsValue', { count: monthsToBuyAll }) : t('common.none')}
              sub={
                monthsToBuyAll !== null
                  ? usingFallback ? t('wishlistInsights.withEstimatedSavings') : t('wishlistInsights.withHistoricalAverage')
                  : effectiveMonthly <= 0
                    ? t('wishlistInsights.savingsMustBePositive')
                    : t('wishlistInsights.noDesiredItems')
              }
            />
          </div>

          {/* O que cabe esse mês */}
          {availableBalance > 0 && desiredCount > 0 && (
            <div className="border-t border-border-subtle pt-4">
              <p className="text-xs font-semibold text-content-2 mb-2">
                {t('wishlistInsights.fitsHeader')}
                <span className="font-normal text-content-3 ml-1">
                  {t('wishlistInsights.availableBalance', { amount: money.format(availableBalance) })}
                </span>
              </p>
              {fitsThisMonth.fitting.length === 0 ? (
                <p className="text-xs text-content-3">{t('wishlistInsights.nothingFits')}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {fitsThisMonth.fitting.map(item => {
                    const n = item.plannedInstallments ?? 1
                    const itemPrice = money.convertToday(item.price, item.currency)
                    const monthly = itemPrice / n
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-success shrink-0"><Check size={12} /></span>
                          <span className="text-content truncate">{item.name}</span>
                          {n > 1 && (
                            <span className="text-accent shrink-0 bg-accent-soft px-1 rounded">
                              {n}×
                            </span>
                          )}
                        </div>
                        <span className="text-content-2 shrink-0 font-medium">
                          {n > 1
                            ? t('wishlistInsights.perMonth', { amount: money.format(monthly) })
                            : money.format(itemPrice)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex justify-between text-xs text-content-3 pt-1 border-t border-border-subtle mt-0.5">
                    <span>{t('wishlistInsights.suggestedTotal')}</span>
                    <span className="font-medium text-content-2">
                      {money.format(fitsThisMonth.totalFit)} / {money.format(availableBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
