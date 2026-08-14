import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBudget } from '../../hooks/useBudget'
import { useCategories } from '../../hooks/useCategories'
import { useTransactions } from '../../hooks/useTransactions'
import { useMoney } from '../../hooks/useMoney'
import { formatMonth } from '../../utils/formatDate'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { toast } from '../../lib/toast'
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
  const { t } = useTranslation()
  const money = useMoney()
  const { budgets, getBudget, saveBudget } = useBudget()
  const { categories } = useCategories()
  const { getByMonth } = useTransactions()

  const transactions = getByMonth(month)

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')
  const existingCategoryIds = new Set(expenseCategories.map(c => c.id))

  const [catLimits, setCatLimits] = useState<Record<string, string>>({})

  // Sincroniza form quando os dados chegam do Supabase ou ao trocar de mês
  useEffect(() => {
    const budget = getBudget(month)
    setCatLimits(
      Object.fromEntries(
        Object.entries(budget.categoryLimits)
          .filter(([k]) => existingCategoryIds.has(k))
          .map(([k, v]) => [k, String(v)])
      )
    )
  }, [budgets, month])

  // O orçamento total não é mais digitado: é a soma dos limites por categoria.
  // Continua sendo persistido em budgets.total_limit porque Dashboard e
  // Relatórios leem esse campo direto.
  const totalLimitValue = Object.values(catLimits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)

  const totalSpent = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.convertedAmount, 0)

  const spentByCategory = (catId: string) =>
    transactions
      .filter(tx => tx.type === 'expense' && tx.categoryId === catId)
      .reduce((sum, tx) => sum + tx.convertedAmount, 0)

  const handleSave = () => {
    saveBudget({
      month,
      totalLimit: totalLimitValue,
      categoryLimits: Object.fromEntries(
        Object.entries(catLimits).map(([k, v]) => [k, parseFloat(v) || 0] as [string, number]).filter(([, v]) => v > 0)
      ),
      // Orçamento é um valor prospectivo: fica gravado na moeda preferida no
      // momento em que foi definido.
      currency: money.preferredCurrency,
    })
    toast.success(t('budget.saved'))
  }

  const handleCopyPrev = () => {
    const prevMonth = format(subMonths(parseISO(`${month}-01`), 1), 'yyyy-MM')
    const prev = getBudget(prevMonth)
    setCatLimits(Object.fromEntries(Object.entries(prev.categoryLimits).map(([k, v]) => [k, String(v)])))
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-content">
          {t('budget.title', { month: formatMonth(month) })}
        </h1>
        <Button variant="secondary" onClick={handleCopyPrev} size="sm">{t('budget.copyPrevious')}</Button>
      </div>

      {/* Total budget — derivado, somente leitura */}
      <Card className="mb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-content-2">{t('budget.monthlyTotal')}</h2>
          <span className="text-2xl font-bold text-content tabular-nums">{money.format(totalLimitValue)}</span>
        </div>
        <p className="text-xs text-content-3 mt-1">{t('budget.derivedHint')}</p>
        {totalLimitValue > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-content-2">
              <span>{t('budget.spent', { amount: money.format(totalSpent) })}</span>
              <span>{t('budget.limit', { amount: money.format(totalLimitValue) })}</span>
            </div>
            <ProgressBar value={totalSpent} max={totalLimitValue} />
          </div>
        )}
      </Card>

      {/* Per-category budgets */}
      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-content-2 mb-4">{t('budget.perCategory')}</h2>
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
                    <span className="text-xs text-content-3">{money.symbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={catLimits[cat.id] ?? ''}
                      onChange={e => setCatLimits(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      placeholder={t('transactionForm.amountPlaceholder')}
                      className="w-28 border border-border rounded-lg px-2 py-1 text-sm outline-none focus:border-accent text-right"
                    />
                  </div>
                </div>
                {limit > 0 && (
                  <div className="pl-6 mt-1">
                    <div className="flex justify-between text-xs text-content-3">
                      <span>{money.format(spent)}</span>
                      <span>{money.format(limit)}</span>
                    </div>
                    <ProgressBar value={spent} max={limit} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {totalLimitValue > 0 && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between text-sm">
            <span className="font-semibold text-content">{t('common.total')}</span>
            <span className="font-bold text-base text-content tabular-nums">{money.format(totalLimitValue)}</span>
          </div>
        )}
      </Card>

      <Button onClick={handleSave} className="w-full">{t('budget.saveButton')}</Button>
    </div>
  )
}
