import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useBudget } from '../../hooks/useBudget'
import { useMoney } from '../../hooks/useMoney'
import { useFxRange } from '../../contexts/FxContext'
import { formatMonthYearShort } from '../../utils/formatDate'
import { exportToCSV } from '../../utils/exportCSV'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { PeriodSelector } from '../ui/PeriodSelector'
import type { Period } from '../ui/PeriodSelector'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, subMonths, parseISO } from 'date-fns'
import { useChartTheme } from '../../lib/chartTheme'

interface ReportsPageProps {
  month: string
}

export function ReportsPage({ month }: ReportsPageProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const { transactions, getByMonth } = useTransactions()
  const { categories } = useCategories()
  const { getBudget } = useBudget()
  const [period, setPeriod] = useState<Period>(12)
  const chart = useChartTheme()

  // Até 24 meses de histórico — garante as cotações do período.
  useFxRange(transactions.map(tx => tx.date))

  const monthlyData = useMemo(() => {
    return Array.from({ length: period }, (_, i) => {
      const m = format(subMonths(parseISO(`${month}-01`), period - 1 - i), 'yyyy-MM')
      const ts = getByMonth(m)
      const income = ts.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.convertedAmount, 0)
      const expense = ts.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.convertedAmount, 0)
      const invested = ts.filter(tx => tx.type === 'investment').reduce((sum, tx) => sum + tx.convertedAmount, 0)
      const budget = getBudget(m)
      return {
        name: formatMonthYearShort(m),
        month: m,
        income,
        expenses: expense,
        invested,
        balance: income - expense - invested,
        budget: budget.totalLimit,
      }
    })
  }, [month, period, getByMonth, getBudget])

  const handleExportMonth = () => {
    const ts = getByMonth(month)
    exportToCSV(ts, categories, t('reports.fileMonth', { month }))
  }

  const handleExportAll = () => {
    exportToCSV(transactions, categories, t('reports.fileAll'))
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-content">{t('reports.title')}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportMonth} className="inline-flex items-center gap-1.5"><Download size={13} /> {t('reports.exportMonth')}</Button>
          <Button variant="secondary" size="sm" onClick={handleExportAll} className="inline-flex items-center gap-1.5"><Download size={13} /> {t('reports.exportAll')}</Button>
        </div>
      </div>

      {/* Line chart */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-content">{t('reports.evolution', { count: period })}</p>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${money.symbol}${(v / 1000).toFixed(0)}k`} width={45} />
            <Tooltip formatter={(v) => money.format(Number(v))} contentStyle={chart.tooltip} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="income" name={t('dashboard.chart.income')} stroke={chart.income} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expenses" name={t('dashboard.chart.expense')} stroke={chart.expense} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="invested" name={t('dashboard.chart.invested')} stroke={chart.invested} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="balance" name={t('dashboard.chart.balance')} stroke={chart.balance} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Summary table */}
      <Card>
        <p className="text-sm font-semibold text-content mb-4">{t('reports.monthlySummary')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-content-2 border-b border-border-subtle">
                <th className="text-left pb-2 font-medium">{t('reports.month')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.chart.income')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.chart.expense')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.chart.invested')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.chart.budget')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.chart.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlyData].reverse().map(row => (
                <tr key={row.month} className="border-b border-border-subtle last:border-0">
                  <td className="py-2.5 text-content">{row.name}</td>
                  <td className="py-2.5 text-right text-success">{money.format(row.income)}</td>
                  <td className="py-2.5 text-right text-content">{money.format(row.expenses)}</td>
                  <td className="py-2.5 text-right text-accent">{money.format(row.invested)}</td>
                  <td className="py-2.5 text-right text-content-3">{row.budget > 0 ? money.format(row.budget) : t('common.none')}</td>
                  <td className={`py-2.5 text-right font-medium ${row.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {money.format(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
