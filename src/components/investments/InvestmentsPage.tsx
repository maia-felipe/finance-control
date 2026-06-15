import { useState } from 'react'
import { Coins, Pencil, Trash2, Repeat } from 'lucide-react'
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
import { formatCurrency, formatUnitPrice } from '../../utils/formatCurrency'
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

interface UpdateValueModalProps {
  investment: Investment
  onSave: (currentValue: number) => void
  onClose: () => void
}

function UpdateValueModal({ investment, onSave, onClose }: UpdateValueModalProps) {
  const [value, setValue] = useState(investment.currentValue.toFixed(2))

  return (
    <Modal open onClose={onClose} title={`Atualizar valor — ${investment.name}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">Valor atual (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            className="border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <p className="text-xs text-content-3">Aportado: {formatCurrency(investment.amountInvested)}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(parseFloat(value) || 0)}>Salvar</Button>
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
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')

  const val = parseFloat(amount) || 0
  const exceedsBalance = val > 0 && val > investment.currentValue

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!val || val <= 0) { setError('Valor inválido'); return }
    onSave(val, date)
  }

  return (
    <Modal open onClose={onClose} title={`Resgatar — ${investment.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Valor do resgate (R$)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
            autoFocus
            placeholder="0,00"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          {!error && exceedsBalance && (
            <p className="text-xs text-orange-500">
              Valor maior que o saldo atual ({formatCurrency(investment.currentValue)}). O saldo será zerado.
            </p>
          )}
          <p className="text-xs text-slate-400">
            Aportado: {formatCurrency(investment.amountInvested)} · Atual: {formatCurrency(investment.currentValue)}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Data</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Registrar resgate</Button>
        </div>
      </form>
    </Modal>
  )
}

function AporteModal({ investment, onSave, onClose }: AporteModalProps) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError('Valor inválido'); return }
    onSave(val, date)
  }

  return (
    <Modal open onClose={onClose} title={`Novo aporte — ${investment.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">Valor do aporte (R$)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
            autoFocus
            placeholder="0,00"
            className="border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content">Data</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Registrar aporte</Button>
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
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useInvestments()
  const { getByMonth, addTransaction, updateTransaction, deleteTransaction, deleteByInvestmentId } = useTransactions()
  const { categories, addCategory, getCategoryById } = useCategories()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [updatingValue, setUpdatingValue] = useState<Investment | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [aportando, setAportando] = useState<Investment | null>(null)
  const [resgatando, setResgatando] = useState<Investment | null>(null)

  const investmentTxs = getByMonth(month)
    .filter(t => t.type === 'investment' || (t.type === 'income' && !!t.investmentId))
    .sort((a, b) => b.date.localeCompare(a.date))
  const totalInvestedMonth = investmentTxs.reduce(
    (s, t) => s + (t.type === 'investment' ? t.amount : -t.amount),
    0,
  )

  const ensureInvestmentCategoryId = (): string => {
    const existing = categories.find(c => c.type === 'investment')
    if (existing) return existing.id
    return addCategory({ name: 'Investimentos', type: 'investment', color: DEFAULT_INVESTMENT_CATEGORY_COLOR })
  }

  const ensureResgateCategoryId = (): string => {
    const existing = categories.find(c => c.name === 'Resgate de Investimento' && c.type === 'income')
    if (existing) return existing.id
    return addCategory({ name: 'Resgate de Investimento', type: 'income', color: DEFAULT_RESGATE_CATEGORY_COLOR })
  }

  const handleAddInvestment = (data: Omit<Investment, 'id' | 'lastUpdated'>) => {
    const investmentId = addInvestment(data)
    if (data.amountInvested > 0) {
      const categoryId = ensureInvestmentCategoryId()
      addTransaction({
        date: data.startDate,
        amount: data.amountInvested,
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
    updateInvestment(investmentId, { amountInvested: inv.amountInvested + amount })
    const categoryId = ensureInvestmentCategoryId()
    addTransaction({
      date,
      amount,
      type: 'investment',
      categoryId,
      description: `Aporte — ${inv.name}`,
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
    })
    const categoryId = ensureResgateCategoryId()
    addTransaction({
      date,
      amount,
      type: 'income',
      categoryId,
      description: `Resgate — ${inv.name}`,
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

  const handleDeleteAporteTx = (t: Transaction) => {
    deleteTransaction(t.id)
    if (!t.investmentId) return
    const inv = investments.find(i => i.id === t.investmentId)
    if (!inv) return
    if (t.type === 'investment') {
      updateInvestment(t.investmentId, {
        amountInvested: Math.max(0, inv.amountInvested - t.amount),
      })
    } else if (t.type === 'income') {
      updateInvestment(t.investmentId, {
        amountInvested: inv.amountInvested + t.amount,
        currentValue: inv.currentValue + t.amount,
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

  const totalInvested = investments.reduce((s, inv) => s + inv.amountInvested, 0)
  const totalCurrent = investments.reduce((s, inv) => s + inv.currentValue, 0)
  const totalGain = totalCurrent - totalInvested
  const totalGainPct = totalInvested > 0 ? ((totalCurrent / totalInvested) - 1) * 100 : 0

  // Group by category for donut chart
  const categoryData = Object.values(
    investments.reduce<Record<string, { name: string; value: number; color: string }>>(
      (acc, inv) => {
        if (!acc[inv.category]) acc[inv.category] = { name: inv.category, value: 0, color: inv.color }
        acc[inv.category].value += inv.currentValue
        return acc
      }, {}
    )
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-content">Investimentos</h1>
        <Button onClick={() => setShowAdd(true)}>+ Novo investimento</Button>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <SummaryCard label="Total aportado" value={formatCurrency(totalInvested)} color="text-content" />
        <SummaryCard label="Valor atual" value={formatCurrency(totalCurrent)} color="text-accent" />
        <SummaryCard
          label={totalGain >= 0 ? 'Ganho total' : 'Perda total'}
          value={`${totalGain >= 0 ? '+' : ''}${formatCurrency(totalGain)}`}
          color={totalGain >= 0 ? 'text-success' : 'text-danger'}
          sub={`${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}%`}
        />
      </div>

      {investments.length === 0 ? (
        <Card>
          <p className="text-sm text-content-3 text-center py-10">
            Nenhum investimento cadastrado ainda.<br />
            <span className="text-accent cursor-pointer" onClick={() => setShowAdd(true)}>Adicionar o primeiro →</span>
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {/* Investment list — spans 2 cols */}
          <div className="md:col-span-2 flex flex-col gap-3">
            {investments.map(inv => {
              const gain = inv.currentValue - inv.amountInvested
              const gainPct = inv.amountInvested > 0 ? ((inv.currentValue / inv.amountInvested) - 1) * 100 : 0
              const isPositive = gain >= 0
              return (
                <Card key={inv.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: inv.color }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-content truncate">{inv.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge color={inv.color} label={inv.category} />
                          <span className="text-xs text-content-3">desde {formatDate(inv.startDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setAportando(inv)} title="Registrar aporte">+ Aporte</Button>
                      <Button size="sm" variant="ghost" onClick={() => setResgatando(inv)} title="Registrar resgate" className="text-danger hover:bg-danger-soft">− Resgatar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setUpdatingValue(inv)} title="Atualizar valor" aria-label="Atualizar valor"><Coins size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(inv)} title="Editar" aria-label="Editar"><Pencil size={14} /></Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteInvestment(inv.id)} title="Excluir" aria-label="Excluir"><Trash2 size={14} /></Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-content-3 mb-0.5">Aportado</p>
                      <p className="font-medium text-content">{formatCurrency(inv.amountInvested)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-content-3 mb-0.5">Valor atual</p>
                      <p className="font-medium text-accent">{formatCurrency(inv.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-content-3 mb-0.5">Ganho/Perda</p>
                      <p className={`font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(gain)}
                        <span className="text-xs font-normal ml-1">({isPositive ? '+' : ''}{gainPct.toFixed(2)}%)</span>
                      </p>
                    </div>
                  </div>

                  {inv.category === 'Câmbio' && inv.quantity && inv.quantity > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-3 text-sm border-t border-border pt-2">
                      <div>
                        <p className="text-xs text-content-3 mb-0.5">Quantidade</p>
                        <p className="font-medium text-content">{inv.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-content-3 mb-0.5">Preço de compra</p>
                        <p className="font-medium text-content">{formatUnitPrice(inv.amountInvested / inv.quantity)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-content-3 mb-0.5">Preço atual</p>
                        <p className="font-medium text-content">{formatUnitPrice(inv.currentValue / inv.quantity)}</p>
                      </div>
                    </div>
                  )}

                  <GainBar invested={inv.amountInvested} current={inv.currentValue} />

                  {inv.notes && (
                    <p className="text-xs text-content-3 mt-2 italic">{inv.notes}</p>
                  )}
                  <p className="text-xs text-content-3 mt-1">Atualizado em {formatDate(inv.lastUpdated)}</p>
                </Card>
              )
            })}
          </div>

          {/* Donut chart — 1 col */}
          <div className="flex flex-col gap-4">
            <Card>
              <p className="text-sm font-semibold text-content mb-3">Alocação atual</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {categoryData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-content-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </div>
                    <span className="text-content-2">{formatCurrency(d.value)}</span>
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
          <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wide">Aportes e resgates — <span className="capitalize">{formatMonth(month)}</span></h2>
          <p className={`text-sm font-semibold mt-0.5 ${totalInvestedMonth >= 0 ? 'text-accent' : 'text-danger'}`}>
            {totalInvestedMonth >= 0 ? '' : '− '}{formatCurrency(Math.abs(totalInvestedMonth))}
          </p>
        </div>
        <Card className="!p-0 overflow-hidden">
          {investmentTxs.length === 0 ? (
            <p className="text-sm text-content-3 text-center py-8">Nenhum aporte ou resgate registrado neste mês.</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {investmentTxs.map(t => {
                const cat = getCategoryById(t.categoryId)
                const isResgate = t.type === 'income'
                return (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.color ?? '#8b5cf6' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-content truncate">{t.description}</p>
                        <p className="text-xs text-content-3">
                          {formatDate(t.date)} · {cat?.name ?? '—'}
                          {t.recurring && <> · <Repeat size={11} className="inline" aria-label="Recorrente" /></>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span className={`text-sm font-semibold ${isResgate ? 'text-danger' : 'text-accent'}`}>
                        {isResgate ? '− ' : ''}{formatCurrency(t.amount)}
                      </span>
                      <span className={`text-sm font-semibold ${isResgate ? 'text-danger' : 'text-accent'}`}>{isResgate ? '− ' : ''}{formatCurrency(t.amount)}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingTx(t)} title="Editar" aria-label="Editar"><Pencil size={14} /></Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteAporteTx(t)} title="Excluir" aria-label="Excluir"><Trash2 size={14} /></Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Editar aporte/resgate">
        {editingTx && (
          <TransactionForm
            initial={editingTx}
            onSubmit={handleEditTx}
            onCancel={() => setEditingTx(null)}
          />
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo investimento">
        <InvestmentForm
          onSubmit={handleAddInvestment}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar investimento">
        {editing && (
          <InvestmentForm
            initial={editing}
            onSubmit={data => { updateInvestment(editing.id, data); setEditing(null) }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

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
