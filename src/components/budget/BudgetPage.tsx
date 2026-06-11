import { useState, useEffect } from 'react'
import { useBudget } from '../../hooks/useBudget'
import { useCategories } from '../../hooks/useCategories'
import { useTransactions } from '../../hooks/useTransactions'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatMonth } from '../../utils/formatDate'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { format, subMonths, parseISO } from 'date-fns'

interface BudgetPageProps {
  month: string
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const color = pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-primary'
  return (
    <div className="w-full bg-surface-2 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function BudgetPage({ month }: BudgetPageProps) {
  const { budgets, getBudget, saveBudget } = useBudget()
  const { categories } = useCategories()
  const { getByMonth } = useTransactions()

  const transactions = getByMonth(month)

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')
  const existingCategoryIds = new Set(expenseCategories.map(c => c.id))

  const [totalLimit, setTotalLimit] = useState('')
  const [catLimits, setCatLimits] = useState<Record<string, string>>({})

  // Sincroniza form quando os dados chegam do Supabase ou ao trocar de mês
  useEffect(() => {
    const budget = getBudget(month)
    setTotalLimit(String(budget.totalLimit || ''))
    setCatLimits(
      Object.fromEntries(
        Object.entries(budget.categoryLimits)
          .filter(([k]) => existingCategoryIds.has(k))
          .map(([k, v]) => [k, String(v)])
      )
    )
  }, [budgets, month])

  const allocatedTotal = Object.values(catLimits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  const totalLimitValue = parseFloat(totalLimit) || 0
  const delta = totalLimitValue - allocatedTotal

  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const spentByCategory = (catId: string) =>
    transactions.filter(t => t.type === 'expense' && t.categoryId === catId).reduce((s, t) => s + t.amount, 0)

  const handleSave = () => {
    saveBudget({
      month,
      totalLimit: parseFloat(totalLimit) || 0,
      categoryLimits: Object.fromEntries(
        Object.entries(catLimits).map(([k, v]) => [k, parseFloat(v) || 0] as [string, number]).filter(([, v]) => v > 0)
      ),
    })
    alert('Orçamento salvo!')
  }

  const handleCopyPrev = () => {
    const prevMonth = format(subMonths(parseISO(`${month}-01`), 1), 'yyyy-MM')
    const prev = getBudget(prevMonth)
    setTotalLimit(String(prev.totalLimit || ''))
    setCatLimits(Object.fromEntries(Object.entries(prev.categoryLimits).map(([k, v]) => [k, String(v)])))
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-content">Orçamento — <span className="capitalize">{formatMonth(month)}</span></h1>
        <Button variant="secondary" onClick={handleCopyPrev} size="sm">Copiar mês anterior</Button>
      </div>

      {/* Total budget */}
      <Card className="mb-4">
        <h2 className="text-sm font-semibold text-content-2 mb-3">Orçamento total do mês</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-content-2">R$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={totalLimit}
            onChange={e => setTotalLimit(e.target.value)}
            placeholder="0,00"
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        {totalLimitValue > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-content-2">
              <span>Gasto: {formatCurrency(totalSpent)}</span>
              <span>Limite: {formatCurrency(totalLimitValue)}</span>
            </div>
            <ProgressBar value={totalSpent} max={totalLimitValue} />
          </div>
        )}
      </Card>

      {/* Per-category budgets */}
      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-content-2 mb-4">Orçamento por categoria</h2>
        <div className="divide-y divide-border-subtle">
          {expenseCategories.map(cat => {
            const spent = spentByCategory(cat.id)
            const limit = parseFloat(catLimits[cat.id] ?? '0') || 0
            return (
              <div key={cat.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                  <span className="text-sm text-content flex-1">{cat.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-content-3">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={catLimits[cat.id] ?? ''}
                      onChange={e => setCatLimits(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      placeholder="0,00"
                      className="w-28 border border-border rounded-lg px-2 py-1 text-sm outline-none focus:border-accent text-right"
                    />
                  </div>
                </div>
                {limit > 0 && (
                  <div className="pl-6 mt-1">
                    <div className="flex justify-between text-xs text-content-3">
                      <span>{formatCurrency(spent)}</span>
                      <span>{formatCurrency(limit)}</span>
                    </div>
                    <ProgressBar value={spent} max={limit} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {totalLimitValue > 0 && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-content-2">Orçamento total</span>
              <span className="font-medium text-content">{formatCurrency(totalLimitValue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-content-2">Distribuído em categorias</span>
              <span className="font-medium text-content">− {formatCurrency(allocatedTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border-subtle">
              <span className="font-semibold text-content">
                {delta >= 0 ? 'Ainda não distribuído' : 'Excedendo o total'}
              </span>
              <span className={`font-bold text-base ${delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-content-3'}`}>
                {delta >= 0 ? formatCurrency(delta) : `− ${formatCurrency(Math.abs(delta))}`}
              </span>
            </div>
            {delta < 0 && (
              <p className="text-xs text-danger mt-1.5">
                As categorias estão alocando {formatCurrency(Math.abs(delta))} a mais do que o orçamento total.
              </p>
            )}
          </div>
        )}
      </Card>

      <Button onClick={handleSave} className="w-full">Salvar orçamento</Button>
    </div>
  )
}
