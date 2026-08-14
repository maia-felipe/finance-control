import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Coins, Minus, Pencil, Trash2, Repeat } from 'lucide-react'
import { useInvestments } from '../../hooks/useInvestments'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import type { Investment, Transaction } from '../../types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { InvestmentForm } from './InvestmentForm'
import { TransactionForm } from '../transactions/TransactionForm'
import { useMoney } from '../../hooks/useMoney'
import { formatDate, formatMonth, monthFromDate, todayISO } from '../../utils/formatDate'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const DEFAULT_INVESTMENT_CATEGORY_COLOR = '#8b5cf6'
const DEFAULT_RESGATE_CATEGORY_COLOR = '#f97316'

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="flex-1 min-w-36">
      <p className="text-xs text-content-2 mb-1">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-xs text-content-3 mt-0.5">{sub}</p>}
    </Card>
  )
}

function GainBar({ invested, current }: { invested: number; current: number }) {
  if (invested <= 0) return null
  const gain = current - invested
  const pct = (gain / invested) * 100
  const isPositive = gain >= 0
  const barPct = Math.min(Math.abs(pct), 100)
  return (
    <div className="mt-1.5">
      <div className="w-full bg-surface-2 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${isPositive ? 'bg-success' : 'bg-danger'}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
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

interface EditQuantityModalProps {
  investment: Investment
  onSave: (quantity: number) => void
  onClose: () => void
}

/**
 * Em câmbio o valor atual é derivado (quantidade x cotação), então o que faz
 * sentido editar é quanto você tem — não quanto vale.
 */
function EditQuantityModal({ investment, onSave, onClose }: EditQuantityModalProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const held = investment.holdingCurrency ?? investment.currency
  const [value, setValue] = useState(investment.quantity?.toString() ?? '')

  const qty = parseFloat(value) || 0
  const marked = money.convertBetweenToday(qty, held, investment.currency)

  return (
    <Modal open onClose={onClose} title={`${t('investments.editQuantity')} — ${investment.name}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">
            {t('investments.quantityHeld', { currency: held })}
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            className="border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          {marked !== null && (
            <p className="text-xs text-content-3">
              {t('investments.marketValueNow', {
                amount: money.formatIn(marked, investment.currency),
                date: formatDate(money.latestRateDate),
              })}
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => onSave(qty)}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  )
}

interface UpdateValueModalProps {
  investment: Investment
  onSave: (currentValue: number) => void
  onClose: () => void
}

function UpdateValueModal({ investment, onSave, onClose }: UpdateValueModalProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const [value, setValue] = useState(investment.currentValue.toFixed(2))

  return (
    <Modal open onClose={onClose} title={`${t('investments.updateValue')} — ${investment.name}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">{t('investments.currentValueLabel', { currency: investment.currency })}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            className="border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <p className="text-xs text-content-3">
            {t('investments.investedSoFar', { amount: money.formatIn(investment.amountInvested, investment.currency) })}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => onSave(parseFloat(value) || 0)}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  )
}

interface AporteModalProps {
  investment: Investment
  onSave: (amount: number, date: string) => void
  onClose: () => void
}

function ResgateModal({ investment, onSave, onClose }: AporteModalProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')

  const val = parseFloat(amount) || 0
  const exceedsBalance = val > 0 && val > investment.currentValue

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!val || val <= 0) { setError(t('investmentForm.invalidAmount')); return }
    onSave(val, date)
  }

  return (
    <Modal open onClose={onClose} title={`${t('investments.registerWithdrawal')} — ${investment.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">{t('investments.withdrawalAmount', { currency: investment.currency })}</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
            autoFocus
            placeholder={t('transactionForm.amountPlaceholder')}
            className="border border-border bg-surface text-content rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          {!error && exceedsBalance && (
            <p className="text-xs text-warning">
              {money.formatIn(investment.currentValue, investment.currency)}
            </p>
          )}
          <p className="text-xs text-content-3">
            {t('investments.investedSoFar', { amount: money.formatIn(investment.amountInvested, investment.currency) })}
            {' · '}
            {money.formatIn(investment.currentValue, investment.currency)}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">{t('common.date')}</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-border bg-surface text-content rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit">{t('investments.registerWithdrawal')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function AporteModal({ investment, onSave, onClose }: AporteModalProps) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError(t('investmentForm.invalidAmount')); return }
    onSave(val, date)
  }

  return (
    <Modal open onClose={onClose} title={`${t('investments.registerContribution')} — ${investment.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">{t('investments.contributionAmount', { currency: investment.currency })}</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
            autoFocus
            placeholder={t('transactionForm.amountPlaceholder')}
            className="border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">{t('common.date')}</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit">{t('investments.registerContribution')}</Button>
        </div>
      </form>
    </Modal>
  )
}

interface InvestmentsPageProps {
  month: string
  onMonthChange: (month: string) => void
}

export function InvestmentsPage({ month, onMonthChange }: InvestmentsPageProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useInvestments()
  const { getByMonth, addTransaction, updateTransaction, deleteTransaction, deleteByInvestmentId } = useTransactions()
  const { categories, addCategory, getCategoryById } = useCategories()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [updatingValue, setUpdatingValue] = useState<Investment | null>(null)
  const [editingQuantity, setEditingQuantity] = useState<Investment | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [aportando, setAportando] = useState<Investment | null>(null)
  const [resgatando, setResgatando] = useState<Investment | null>(null)

  const investmentTxs = getByMonth(month)
    .filter(tx => tx.type === 'investment' || (tx.type === 'income' && !!tx.investmentId))
    .sort((a, b) => b.date.localeCompare(a.date))
  const totalInvestedMonth = investmentTxs.reduce(
    (sum, tx) => sum + (tx.type === 'investment' ? tx.convertedAmount : -tx.convertedAmount),
    0,
  )

  /**
   * Custo e valor de mercado de um investimento, na moeda preferida.
   * O custo usa a cotação da data de início e o valor atual a de hoje, então a
   * variação cambial aparece dentro do ganho/perda — que é o resultado real de
   * manter dinheiro em outra moeda.
   */
  const inPreferred = (inv: Investment) => ({
    invested: money.convert(inv.amountInvested, inv.currency, inv.startDate),
    current: money.convertToday(inv.currentValue, inv.currency),
  })

  const ensureInvestmentCategoryId = (): string => {
    const existing = categories.find(c => c.type === 'investment')
    if (existing) return existing.id
    return addCategory({ name: t('investments.investmentsCategory'), type: 'investment', color: DEFAULT_INVESTMENT_CATEGORY_COLOR })
  }

  const ensureResgateCategoryId = (): string => {
    const withdrawalName = t('investments.withdrawalCategory')
    const existing = categories.find(c => c.name === withdrawalName && c.type === 'income')
    if (existing) return existing.id
    return addCategory({ name: withdrawalName, type: 'income', color: DEFAULT_RESGATE_CATEGORY_COLOR })
  }

  // Aporte/resgate numa posição de câmbio mexe na quantidade de moeda, não só
  // no valor investido. Converte pela cotação do dia da operação. Devolve {}
  // para tudo que não é câmbio, para poder ser espalhado sem condicional.
  const fxQuantityAfter = (
    inv: Investment, amount: number, date: string, direction: 'buy' | 'sell',
  ): Partial<Investment> => {
    if (inv.category !== 'fx' || !inv.holdingCurrency) return {}
    const units = money.convertBetweenOn(amount, inv.currency, inv.holdingCurrency, date)
    if (units === null) return {}
    const current = inv.quantity ?? 0
    return { quantity: direction === 'buy' ? current + units : Math.max(0, current - units) }
  }

  const handleAddInvestment = (data: Omit<Investment, 'id' | 'lastUpdated'>) => {
    const investmentId = addInvestment(data)
    if (data.amountInvested > 0) {
      const categoryId = ensureInvestmentCategoryId()
      addTransaction({
        date: data.startDate,
        amount: data.amountInvested,
        currency: data.currency,
        type: 'investment',
        categoryId,
        description: data.name,
        recurring: false,
        investmentId,
      })
      const txMonth = monthFromDate(data.startDate)
      if (txMonth !== month) onMonthChange(txMonth)
    }
    setShowAdd(false)
  }

  const handleAporte = (investmentId: string, amount: number, date: string) => {
    const inv = investments.find(i => i.id === investmentId)!
    updateInvestment(investmentId, {
      amountInvested: inv.amountInvested + amount,
      // Em câmbio, aportar é comprar moeda: a quantidade tem que subir junto,
      // ou o preço médio e o valor de mercado ficam incoerentes. Usa a cotação
      // de mercado do dia; se você pagou com spread, ajuste em "editar
      // quantidade".
      ...fxQuantityAfter(inv, amount, date, 'buy'),
    })
    const categoryId = ensureInvestmentCategoryId()
    addTransaction({
      date,
      amount,
      currency: inv.currency,
      type: 'investment',
      categoryId,
      description: t('investments.contributionPrefix', { name: inv.name }),
      recurring: false,
      investmentId,
    })
    setAportando(null)
    const txMonth = monthFromDate(date)
    if (txMonth !== month) onMonthChange(txMonth)
  }

  const handleResgate = (investmentId: string, amount: number, date: string) => {
    const inv = investments.find(i => i.id === investmentId)!
    updateInvestment(investmentId, {
      amountInvested: Math.max(0, inv.amountInvested - amount),
      currentValue: Math.max(0, inv.currentValue - amount),
      ...fxQuantityAfter(inv, amount, date, 'sell'),
    })
    const categoryId = ensureResgateCategoryId()
    addTransaction({
      date,
      amount,
      currency: inv.currency,
      type: 'income',
      categoryId,
      description: t('investments.withdrawalPrefix', { name: inv.name }),
      recurring: false,
      investmentId,
    })
    setResgatando(null)
    const txMonth = monthFromDate(date)
    if (txMonth !== month) onMonthChange(txMonth)
  }

  const handleDeleteInvestment = (id: string) => {
    deleteInvestment(id)
    deleteByInvestmentId(id)
  }

  const handleDeleteAporteTx = (tx: Transaction) => {
    deleteTransaction(tx.id)
    if (!tx.investmentId) return
    const inv = investments.find(i => i.id === tx.investmentId)
    if (!inv) return
    if (tx.type === 'investment') {
      updateInvestment(tx.investmentId, {
        amountInvested: Math.max(0, inv.amountInvested - tx.amount),
      })
    } else if (tx.type === 'income') {
      updateInvestment(tx.investmentId, {
        amountInvested: inv.amountInvested + tx.amount,
        currentValue: inv.currentValue + tx.amount,
      })
    }
  }

  const handleEditTx = (data: Omit<Transaction, 'id'>) => {
    if (!editingTx) return
    updateTransaction(editingTx.id, data)
    setEditingTx(null)
    const txMonth = monthFromDate(data.date)
    if (txMonth !== month) onMonthChange(txMonth)
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inPreferred(inv).invested, 0)
  const totalCurrent = investments.reduce((sum, inv) => sum + inPreferred(inv).current, 0)
  const totalGain = totalCurrent - totalInvested
  const totalGainPct = totalInvested > 0 ? ((totalCurrent / totalInvested) - 1) * 100 : 0

  // Group by category for donut chart
  const categoryData = Object.values(
    investments.reduce<Record<string, { name: string; value: number; color: string }>>(
      (acc, inv) => {
        if (!acc[inv.category]) {
          acc[inv.category] = { name: t(`investments.categories.${inv.category}`), value: 0, color: inv.color }
        }
        acc[inv.category].value += inPreferred(inv).current
        return acc
      }, {}
    )
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-content">{t('investments.title')}</h1>
        <Button onClick={() => setShowAdd(true)}>+ {t('common.add')}</Button>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <SummaryCard label={t('investments.totalInvested')} value={money.format(totalInvested)} color="text-content" />
        <SummaryCard label={t('investments.currentValue')} value={money.format(totalCurrent)} color="text-accent" />
        <SummaryCard
          label={t('investments.gainLoss')}
          value={`${totalGain >= 0 ? '+' : ''}${money.format(totalGain)}`}
          color={totalGain >= 0 ? 'text-success' : 'text-danger'}
          sub={`${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}%`}
        />
      </div>

      {investments.length === 0 ? (
        <Card>
          <p className="text-sm text-content-3 text-center py-10">
            <span className="text-accent cursor-pointer" onClick={() => setShowAdd(true)}>{t('investments.addFirst')}</span>
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {/* Investment list — spans 2 cols */}
          <div className="md:col-span-2 flex flex-col gap-3">
            {investments.map(inv => {
              const { invested, current } = inPreferred(inv)
              const gain = current - invested
              const gainPct = invested > 0 ? ((current / invested) - 1) * 100 : 0
              const isPositive = gain >= 0
              const isForeign = inv.currency !== money.preferredCurrency
              return (
                <Card key={inv.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: inv.color }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-content truncate">{inv.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge color={inv.color} label={t(`investments.categories.${inv.category}`)} />
                          <span className="text-xs text-content-3">{t('investments.since', { date: formatDate(inv.startDate) })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setAportando(inv)} title={t('investments.registerContribution')}>+</Button>
                      <Button size="sm" variant="ghost" onClick={() => setResgatando(inv)} title={t('investments.registerWithdrawal')} aria-label={t('investments.registerWithdrawal')}><Minus size={14} /></Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => (inv.category === 'fx' ? setEditingQuantity(inv) : setUpdatingValue(inv))}
                        title={inv.category === 'fx' ? t('investments.editQuantity') : t('investments.updateValue')}
                        aria-label={inv.category === 'fx' ? t('investments.editQuantity') : t('investments.updateValue')}
                      ><Coins size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(inv)} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={14} /></Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteInvestment(inv.id)} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={14} /></Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-content-3 mb-0.5">{t('investments.invested')}</p>
                      <p className="font-medium text-content">{money.format(invested)}</p>
                      {isForeign && (
                        <p className="text-xs text-content-3">{money.formatIn(inv.amountInvested, inv.currency)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-content-3 mb-0.5">{t('investments.currentValue')}</p>
                      <p className="font-medium text-accent">{money.format(current)}</p>
                      {isForeign && (
                        <p className="text-xs text-content-3">{money.formatIn(inv.currentValue, inv.currency)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-content-3 mb-0.5">{t('investments.gainLoss')}</p>
                      <p className={`font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
                        {isPositive ? '+' : ''}{money.format(gain)}
                        <span className="text-xs font-normal ml-1">({isPositive ? '+' : ''}{gainPct.toFixed(2)}%)</span>
                      </p>
                    </div>
                  </div>

                  {inv.category === 'fx' && inv.quantity && inv.quantity > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-3 text-sm border-t border-border pt-2">
                      <div>
                        <p className="text-xs text-content-3 mb-0.5">{t('investments.quantity')}</p>
                        <p className="font-medium text-content">{inv.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-content-3 mb-0.5">{t('investments.purchasePrice')}</p>
                        <p className="font-medium text-content">{money.formatUnit(inv.amountInvested / inv.quantity, inv.currency)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-content-3 mb-0.5">{t('investments.currentPrice')}</p>
                        <p className="font-medium text-content">{money.formatUnit(inv.currentValue / inv.quantity, inv.currency)}</p>
                      </div>
                    </div>
                  )}

                  <GainBar invested={invested} current={current} />

                  {inv.notes && (
                    <p className="text-xs text-content-3 mt-2 italic">{inv.notes}</p>
                  )}
                  {/* Câmbio se atualiza sozinho: mostra a data da cotação, não
                      a da última edição manual. */}
                  <p className="text-xs text-content-3 mt-1">
                    {inv.category === 'fx' && inv.holdingCurrency
                      ? t('investments.marketRateOn', { date: formatDate(money.latestRateDate) })
                      : t('investments.updatedOn', { date: formatDate(inv.lastUpdated) })}
                  </p>
                </Card>
              )
            })}
          </div>

          {/* Donut chart — 1 col */}
          <div className="flex flex-col gap-4">
            <Card>
              <p className="text-sm font-semibold text-content mb-3">{t('investments.allocation')}</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CurrencyTooltip format={money.format} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {categoryData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-content-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </div>
                    <span className="text-content-2">{money.format(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Aportes e resgates do mês */}
      <div className="mt-6">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wide">{t('investments.contributionsIn', { month: formatMonth(month) })}</h2>
          <p className="text-sm font-semibold text-accent mt-0.5">{money.format(totalInvestedMonth)}</p>
        </div>
        <Card className="!p-0 overflow-hidden">
          {investmentTxs.length === 0 ? (
            <p className="text-sm text-content-3 text-center py-8">{t('transactions.noExpenses')}</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {investmentTxs.map(tx => {
                const cat = getCategoryById(tx.categoryId)
                const isResgate = tx.type === 'income'
                return (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.color ?? '#8b5cf6' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-content truncate">{tx.description || cat?.name || '—'}</p>
                        <p className="text-xs text-content-3">
                          {formatDate(tx.date)}
                          {tx.description ? <> · {cat?.name ?? '—'}</> : null}
                          {tx.recurring && <> · <Repeat size={11} className="inline" aria-label={t('common.recurring')} /></>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span className={`text-sm font-semibold text-right ${isResgate ? 'text-danger' : 'text-accent'}`}>
                        {isResgate ? '− ' : ''}{money.formatIn(tx.amount, tx.currency)}
                        {tx.currency !== money.preferredCurrency && (
                          <span className="block text-xs font-normal text-content-3">≈ {money.format(tx.convertedAmount)}</span>
                        )}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingTx(tx)} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={14} /></Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteAporteTx(tx)} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={14} /></Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title={t('common.edit')}>
        {editingTx && (
          <TransactionForm
            initial={editingTx}
            onSubmit={handleEditTx}
            onCancel={() => setEditingTx(null)}
          />
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('investments.title')}>
        <InvestmentForm
          onSubmit={handleAddInvestment}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={t('common.edit')}>
        {editing && (
          <InvestmentForm
            initial={editing}
            onSubmit={data => { updateInvestment(editing.id, data); setEditing(null) }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {editingQuantity && (
        <EditQuantityModal
          investment={editingQuantity}
          onSave={quantity => { updateInvestment(editingQuantity.id, { quantity }); setEditingQuantity(null) }}
          onClose={() => setEditingQuantity(null)}
        />
      )}

      {updatingValue && (
        <UpdateValueModal
          investment={updatingValue}
          onSave={value => { updateInvestment(updatingValue.id, { currentValue: value }); setUpdatingValue(null) }}
          onClose={() => setUpdatingValue(null)}
        />
      )}

      {aportando && (
        <AporteModal
          investment={aportando}
          onSave={(amount, date) => handleAporte(aportando.id, amount, date)}
          onClose={() => setAportando(null)}
        />
      )}

      {resgatando && (
        <ResgateModal
          investment={resgatando}
          onSave={(amount, date) => handleResgate(resgatando.id, amount, date)}
          onClose={() => setResgatando(null)}
        />
      )}
    </div>
  )
}
