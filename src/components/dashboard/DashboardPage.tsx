import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useBudget } from '../../hooks/useBudget'
import { useInvestments } from '../../hooks/useInvestments'
import { useMoney } from '../../hooks/useMoney'
import { useFxRange } from '../../contexts/FxContext'
import { formatMonth, formatMonthShort } from '../../utils/formatDate'
import { Card } from '../ui/Card'
import { CategoryIcon } from '../ui/CategoryIcon'
import { PeriodSelector } from '../ui/PeriodSelector'
import type { Period } from '../ui/PeriodSelector'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { format, subMonths, parseISO } from 'date-fns'
import { useChartTheme } from '../../lib/chartTheme'

interface DashboardPageProps {
  month: string
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="flex-1">
      <p className="text-xs text-content-2 mb-1">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-xs text-content-3 mt-0.5">{sub}</p>}
    </Card>
  )
}

function ProgressBar({ value, max, color = 'bg-primary' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const barColor = pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : color
  return (
    <div className="w-full bg-surface-2 rounded-full h-2">
      <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// O Recharts clona o elemento passado em `content`, injetando active/payload e
// preservando as props já definidas. Definir o componente no módulo (em vez de
// fabricá-lo em render) evita remontar o tooltip a cada render.
interface CurrencyTooltipProps {
  active?: boolean
  payload?: { name?: string; value?: number }[]
  format: (value: number) => string
}

function CurrencyTooltip({ active, payload, format }: CurrencyTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border-subtle rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-content">{payload[0].name}</p>
      <p className="text-content-2">{format(payload[0].value ?? 0)}</p>
    </div>
  )
}

export function DashboardPage({ month }: DashboardPageProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const { transactions: allTransactions, getByMonth, getCumulativeBalance } = useTransactions()
  const { categories, getCategoryById } = useCategories()
  const { getBudget } = useBudget()
  const { investments } = useInvestments()
  const [period, setPeriod] = useState<Period>(6)
  const chart = useChartTheme()

  const transactions = getByMonth(month)
  const budget = getBudget(month)

  // O gráfico histórico olha até 24 meses para trás — garante que as cotações
  // desse período estejam carregadas.
  useFxRange(allTransactions.map(tx => tx.date))

  const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.convertedAmount, 0)
  const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.convertedAmount, 0)
  // Valor de mercado usa a cotação de hoje; o custo, a do dia do aporte — a
  // variação cambial entra no ganho/perda, que é o resultado real de manter
  // dinheiro em outra moeda.
  const investmentsCurrentValue = investments.reduce((sum, inv) => sum + money.convertToday(inv.currentValue, inv.currency), 0)
  const investmentsAmountInvested = investments.reduce((sum, inv) => sum + money.convert(inv.amountInvested, inv.currency, inv.startDate), 0)
  const investmentsGain = investmentsCurrentValue - investmentsAmountInvested
  const investmentsGainPct = investmentsAmountInvested > 0 ? (investmentsGain / investmentsAmountInvested) * 100 : 0
  const balance = getCumulativeBalance(month)

  const excludedFromCharts = useMemo(
    () => new Set(categories.filter(c => c.excludeFromCharts).map(c => c.id)),
    [categories]
  )

  // Category breakdown for donut chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    transactions
      .filter(tx => tx.type === 'expense' && !excludedFromCharts.has(tx.categoryId))
      .forEach(tx => { map[tx.categoryId] = (map[tx.categoryId] ?? 0) + tx.convertedAmount })
    return Object.entries(map)
      .map(([id, value]) => ({ name: getCategoryById(id)?.name ?? '?', value, color: getCategoryById(id)?.color ?? '#6b7280' }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, getCategoryById, excludedFromCharts])

  // History bar chart
  const historyData = useMemo(() => {
    return Array.from({ length: period }, (_, i) => {
      const m = format(subMonths(parseISO(`${month}-01`), period - 1 - i), 'yyyy-MM')
      const ts = getByMonth(m)
      const b = getBudget(m)
      return {
        name: formatMonthShort(m),
        expense: ts.filter(tx => tx.type === 'expense' && !excludedFromCharts.has(tx.categoryId)).reduce((sum, tx) => sum + tx.convertedAmount, 0),
        planned: b.totalLimit,
        income: ts.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.convertedAmount, 0),
        invested: ts.filter(tx => tx.type === 'investment').reduce((sum, tx) => sum + tx.convertedAmount, 0),
      }
    })
  }, [month, period, getByMonth, getBudget, excludedFromCharts])

  // Category progress bars
  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')
  const catProgress = expenseCategories
    .map(cat => ({
      cat,
      spent: transactions.filter(tx => tx.type === 'expense' && tx.categoryId === cat.id).reduce((sum, tx) => sum + tx.convertedAmount, 0),
      limit: budget.categoryLimits[cat.id] ?? 0,
    }))
    .filter(c => c.spent > 0 || c.limit > 0)

  const budgetPct = budget.totalLimit > 0 ? Math.round((totalExpense / budget.totalLimit) * 100) : null

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-content mb-6">{formatMonth(month)}</h1>

      {/* Summary cards */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <SummaryCard label={t('dashboard.balance')} value={money.format(balance)} color={balance >= 0 ? 'text-success' : 'text-danger'} />
        <SummaryCard label={t('dashboard.income')} value={money.format(totalIncome)} color="text-success" />
        <SummaryCard
          label={t('dashboard.expenses')}
          value={money.format(totalExpense)}
          color="text-content"
          sub={budget.totalLimit > 0
            ? t('dashboard.budgetShare', { pct: budgetPct, amount: money.format(budget.totalLimit) })
            : undefined}
        />
        <SummaryCard
          label={t('dashboard.invested')}
          value={money.format(investmentsCurrentValue)}
          color="text-accent"
          sub={investmentsAmountInvested > 0 ? `${investmentsGain >= 0 ? '+' : ''}${money.format(investmentsGain)} (${investmentsGainPct >= 0 ? '+' : ''}${investmentsGainPct.toFixed(2)}%)` : undefined}
        />
      </div>

      {/* Budget progress */}
      {budget.totalLimit > 0 && (
        <Card className="mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-content">{t('dashboard.overallBudget')}</span>
            <span className="text-content-2">{money.format(totalExpense)} / {money.format(budget.totalLimit)}</span>
          </div>
          <ProgressBar value={totalExpense} max={budget.totalLimit} />
        </Card>
      )}

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {/* Donut chart */}
        <Card>
          <p className="text-sm font-semibold text-content mb-4">{t('dashboard.spendingByCategory')}</p>
          {categoryData.length === 0 ? (
            <p className="text-sm text-content-3 text-center py-10">{t('dashboard.noSpending')}</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CurrencyTooltip format={money.format} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                {categoryData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-content-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Bar chart - history */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-content">{t('dashboard.lastMonths', { count: period })}</p>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={historyData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${money.symbol}${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip formatter={(v) => money.format(Number(v))} contentStyle={chart.tooltip} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" name={t('dashboard.chart.income')} fill={chart.income} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name={t('dashboard.chart.expense')} fill={chart.expense} radius={[4, 4, 0, 0]} />
              <Bar dataKey="invested" name={t('dashboard.chart.invested')} fill={chart.invested} radius={[4, 4, 0, 0]} />
              <Bar dataKey="planned" name={t('dashboard.chart.planned')} fill={chart.planned} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Category progress */}
      {catProgress.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-content mb-4">{t('dashboard.categoryProgress')}</p>
          <div className="flex flex-col gap-3">
            {catProgress.map(({ cat, spent, limit }) => (
              <div key={cat.id}>
                <div className="flex justify-between text-xs text-content-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                    {cat.name}
                  </div>
                  <span>
                    {money.format(spent)}
                    {limit > 0 && <span className="text-content-3"> / {money.format(limit)}</span>}
                  </span>
                </div>
                {limit > 0 && <ProgressBar value={spent} max={limit} />}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
