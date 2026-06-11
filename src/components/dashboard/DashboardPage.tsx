import { useMemo, useState } from 'react'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useBudget } from '../../hooks/useBudget'
import { useInvestments } from '../../hooks/useInvestments'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatMonth } from '../../utils/formatDate'
import { Card } from '../ui/Card'
import { CategoryIcon } from '../ui/CategoryIcon'
import { PeriodSelector } from '../ui/PeriodSelector'
import type { Period } from '../ui/PeriodSelector'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { format, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface border border-border-subtle rounded-xl shadow-lg px-3 py-2 text-sm">
        <p className="font-medium text-content">{payload[0].name}</p>
        <p className="text-content-2">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export function DashboardPage({ month }: DashboardPageProps) {
  const { getByMonth, getCumulativeBalance } = useTransactions()
  const { categories, getCategoryById } = useCategories()
  const { getBudget } = useBudget()
  const { investments } = useInvestments()
  const [period, setPeriod] = useState<Period>(6)
  const chart = useChartTheme()

  const transactions = getByMonth(month)
  const budget = getBudget(month)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const investmentsCurrentValue = investments.reduce((s, inv) => s + inv.currentValue, 0)
  const investmentsAmountInvested = investments.reduce((s, inv) => s + inv.amountInvested, 0)
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
      .filter(t => t.type === 'expense' && !excludedFromCharts.has(t.categoryId))
      .forEach(t => { map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount })
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
        name: format(parseISO(`${m}-01`), 'MMM', { locale: ptBR }),
        Gasto: ts.filter(t => t.type === 'expense' && !excludedFromCharts.has(t.categoryId)).reduce((s, t) => s + t.amount, 0),
        Planejado: b.totalLimit,
        Receita: ts.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        Investido: ts.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0),
      }
    })
  }, [month, period, getByMonth, getBudget, excludedFromCharts])

  // Category progress bars
  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')
  const catProgress = expenseCategories
    .map(cat => ({
      cat,
      spent: transactions.filter(t => t.type === 'expense' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0),
      limit: budget.categoryLimits[cat.id] ?? 0,
    }))
    .filter(c => c.spent > 0 || c.limit > 0)

  const budgetPct = budget.totalLimit > 0 ? Math.round((totalExpense / budget.totalLimit) * 100) : null

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-content mb-6 capitalize">{formatMonth(month)}</h1>

      {/* Summary cards */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <SummaryCard label="Saldo" value={formatCurrency(balance)} color={balance >= 0 ? 'text-success' : 'text-danger'} />
        <SummaryCard label="Receitas" value={formatCurrency(totalIncome)} color="text-success" />
        <SummaryCard
          label="Gastos"
          value={formatCurrency(totalExpense)}
          color="text-content"
          sub={budget.totalLimit > 0 ? `${budgetPct}% do orçamento (${formatCurrency(budget.totalLimit)})` : undefined}
        />
        <SummaryCard
          label="Investido"
          value={formatCurrency(investmentsCurrentValue)}
          color="text-accent"
          sub={investmentsAmountInvested > 0 ? `${investmentsGain >= 0 ? '+' : ''}${formatCurrency(investmentsGain)} (${investmentsGainPct >= 0 ? '+' : ''}${investmentsGainPct.toFixed(2)}%)` : undefined}
        />
      </div>

      {/* Budget progress */}
      {budget.totalLimit > 0 && (
        <Card className="mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-content">Orçamento geral</span>
            <span className="text-content-2">{formatCurrency(totalExpense)} / {formatCurrency(budget.totalLimit)}</span>
          </div>
          <ProgressBar value={totalExpense} max={budget.totalLimit} />
        </Card>
      )}

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {/* Donut chart */}
        <Card>
          <p className="text-sm font-semibold text-content mb-4">Gastos por categoria</p>
          {categoryData.length === 0 ? (
            <p className="text-sm text-content-3 text-center py-10">Nenhum gasto registrado.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
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
            <p className="text-sm font-semibold text-content">Últimos {period} meses</p>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={historyData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} width={45} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={chart.tooltip} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Receita" fill={chart.income} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gasto" fill={chart.expense} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Investido" fill={chart.invested} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Planejado" fill={chart.planned} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Category progress */}
      {catProgress.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-content mb-4">Progresso por categoria</p>
          <div className="flex flex-col gap-3">
            {catProgress.map(({ cat, spent, limit }) => (
              <div key={cat.id}>
                <div className="flex justify-between text-xs text-content-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                    {cat.name}
                  </div>
                  <span>
                    {formatCurrency(spent)}
                    {limit > 0 && <span className="text-content-3"> / {formatCurrency(limit)}</span>}
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
