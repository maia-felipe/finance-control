import { useMemo, useState } from 'react'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useBudget } from '../../hooks/useBudget'
import { formatCurrency } from '../../utils/formatCurrency'
import { exportToCSV } from '../../utils/exportCSV'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { PeriodSelector } from '../ui/PeriodSelector'
import type { Period } from '../ui/PeriodSelector'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ReportsPageProps {
  month: string
}

export function ReportsPage({ month }: ReportsPageProps) {
  const { transactions, getByMonth } = useTransactions()
  const { categories } = useCategories()
  const { getBudget } = useBudget()
  const [period, setPeriod] = useState<Period>(12)

  const monthlyData = useMemo(() => {
    return Array.from({ length: period }, (_, i) => {
      const m = format(subMonths(parseISO(`${month}-01`), period - 1 - i), 'yyyy-MM')
      const ts = getByMonth(m)
      const income = ts.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = ts.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const budget = getBudget(m)
      return {
        name: format(parseISO(`${m}-01`), 'MMM/yy', { locale: ptBR }),
        month: m,
        Receitas: income,
        Gastos: expense,
        Saldo: income - expense,
        Orçamento: budget.totalLimit,
      }
    })
  }, [month, period, getByMonth, getBudget])

  const handleExportMonth = () => {
    const ts = getByMonth(month)
    exportToCSV(ts, categories, `financas_${month}.csv`)
  }

  const handleExportAll = () => {
    exportToCSV(transactions, categories, `financas_completo.csv`)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800">Relatórios</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportMonth}>⬇ Exportar mês</Button>
          <Button variant="secondary" size="sm" onClick={handleExportAll}>⬇ Exportar tudo</Button>
        </div>
      </div>

      {/* Line chart */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">Evolução dos últimos {period} meses</p>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} width={45} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Gastos" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Saldo" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Summary table */}
      <Card>
        <p className="text-sm font-semibold text-slate-700 mb-4">Resumo mensal</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left pb-2 font-medium">Mês</th>
                <th className="text-right pb-2 font-medium">Receitas</th>
                <th className="text-right pb-2 font-medium">Gastos</th>
                <th className="text-right pb-2 font-medium">Orçamento</th>
                <th className="text-right pb-2 font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlyData].reverse().map(row => (
                <tr key={row.month} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 text-slate-700 capitalize">{row.name}</td>
                  <td className="py-2.5 text-right text-emerald-600">{formatCurrency(row.Receitas)}</td>
                  <td className="py-2.5 text-right text-slate-700">{formatCurrency(row.Gastos)}</td>
                  <td className="py-2.5 text-right text-slate-400">{row.Orçamento > 0 ? formatCurrency(row.Orçamento) : '—'}</td>
                  <td className={`py-2.5 text-right font-medium ${row.Saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(row.Saldo)}
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
