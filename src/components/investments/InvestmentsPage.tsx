import { useState } from 'react'
import { useInvestments } from '../../hooks/useInvestments'
import type { Investment } from '../../types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { InvestmentForm } from './InvestmentForm'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="flex-1 min-w-36">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
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
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${isPositive ? 'bg-emerald-500' : 'bg-red-400'}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3 py-2 text-sm">
        <p className="font-medium text-slate-700">{payload[0].name}</p>
        <p className="text-slate-500">{formatCurrency(payload[0].value)}</p>
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
          <label className="text-sm font-medium text-slate-700">Valor atual (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <p className="text-xs text-slate-400">Aportado: {formatCurrency(investment.amountInvested)}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(parseFloat(value) || 0)}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}

export function InvestmentsPage() {
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useInvestments()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [updatingValue, setUpdatingValue] = useState<Investment | null>(null)

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
        <h1 className="text-xl font-bold text-slate-800">Investimentos</h1>
        <Button onClick={() => setShowAdd(true)}>+ Novo investimento</Button>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <SummaryCard label="Total aportado" value={formatCurrency(totalInvested)} color="text-slate-800" />
        <SummaryCard label="Valor atual" value={formatCurrency(totalCurrent)} color="text-indigo-600" />
        <SummaryCard
          label={totalGain >= 0 ? 'Ganho total' : 'Perda total'}
          value={`${totalGain >= 0 ? '+' : ''}${formatCurrency(totalGain)}`}
          color={totalGain >= 0 ? 'text-emerald-600' : 'text-red-500'}
          sub={`${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}%`}
        />
      </div>

      {investments.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400 text-center py-10">
            Nenhum investimento cadastrado ainda.<br />
            <span className="text-indigo-500 cursor-pointer" onClick={() => setShowAdd(true)}>Adicionar o primeiro →</span>
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
                        <p className="text-sm font-semibold text-slate-800 truncate">{inv.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge color={inv.color} label={inv.category} />
                          <span className="text-xs text-slate-400">desde {formatDate(inv.startDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setUpdatingValue(inv)} title="Atualizar valor">💰</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(inv)}>✏️</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteInvestment(inv.id)}>🗑️</Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Aportado</p>
                      <p className="font-medium text-slate-700">{formatCurrency(inv.amountInvested)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Valor atual</p>
                      <p className="font-medium text-indigo-600">{formatCurrency(inv.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Ganho/Perda</p>
                      <p className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(gain)}
                        <span className="text-xs font-normal ml-1">({isPositive ? '+' : ''}{gainPct.toFixed(2)}%)</span>
                      </p>
                    </div>
                  </div>

                  <GainBar invested={inv.amountInvested} current={inv.currentValue} />

                  {inv.notes && (
                    <p className="text-xs text-slate-400 mt-2 italic">{inv.notes}</p>
                  )}
                  <p className="text-xs text-slate-300 mt-1">Atualizado em {formatDate(inv.lastUpdated)}</p>
                </Card>
              )
            })}
          </div>

          {/* Donut chart — 1 col */}
          <div className="flex flex-col gap-4">
            <Card>
              <p className="text-sm font-semibold text-slate-700 mb-3">Alocação atual</p>
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
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </div>
                    <span className="text-slate-500">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo investimento">
        <InvestmentForm
          onSubmit={data => { addInvestment(data); setShowAdd(false) }}
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
    </div>
  )
}
