import { useState } from 'react'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import type { Transaction, TransactionType } from '../../types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TransactionForm } from './TransactionForm'
import { ImportModal } from './ImportModal'
import { formatDate, monthFromDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

interface TransactionsPageProps {
  month: string
  type: TransactionType
  onMonthChange: (month: string) => void
}

export function TransactionsPage({ month, type, onMonthChange }: TransactionsPageProps) {
  const { transactions, getByMonth, addTransaction, updateTransaction, deleteTransaction } = useTransactions()
  const { getCategoryById, categories } = useCategories()
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')

  const isExpense = type === 'expense'
  const title = isExpense ? 'Gastos' : 'Receitas'
  const emptyMsg = isExpense ? 'Nenhum gasto registrado neste mês.' : 'Nenhuma receita registrada neste mês.'
  const addLabel = isExpense ? '+ Novo gasto' : '+ Nova receita'
  const modalTitle = isExpense ? 'Novo gasto' : 'Nova receita'

  const relevantCategories = categories.filter(c => c.type === type || c.type === 'both')

  const filtered = getByMonth(month)
    .filter(t => t.type === type)
    .filter(t => !filterCategory || t.categoryId === filterCategory)
    .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))

  const total = filtered.reduce((s, t) => s + t.amount, 0)

  const handleAdd = (data: Omit<Transaction, 'id'>) => {
    addTransaction(data)
    setShowAdd(false)
    const txMonth = monthFromDate(data.date)
    if (txMonth !== month) onMonthChange(txMonth)
  }

  const handleEdit = (data: Omit<Transaction, 'id'>) => {
    updateTransaction(editing!.id, data)
    setEditing(null)
    const txMonth = monthFromDate(data.date)
    if (txMonth !== month) onMonthChange(txMonth)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          <p className={`text-sm font-semibold mt-0.5 ${isExpense ? 'text-slate-600' : 'text-emerald-600'}`}>
            {isExpense ? '-' : '+'}{formatCurrency(total)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>Importar</Button>
          <Button onClick={() => setShowAdd(true)}>{addLabel}</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-32 outline-none focus:border-indigo-500"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-indigo-500"
        >
          <option value="">Todas as categorias</option>
          {relevantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <Card className="!p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">{emptyMsg}</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(t => {
              const cat = getCategoryById(t.categoryId)
              return (
                <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat?.color ?? '#6b7280' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(t.date)} · {cat?.name ?? '—'}
                        {t.recurring && ' · 🔄'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className={`text-sm font-semibold ${isExpense ? 'text-slate-800' : 'text-emerald-600'}`}>
                      {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>✏️</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteTransaction(t.id)}>🗑️</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={modalTitle}>
        <TransactionForm
          initial={{ type }}
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        categories={categories}
        existingTransactions={transactions}
        onImport={rows => rows.forEach(r => addTransaction(r))}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Editar ${isExpense ? 'gasto' : 'receita'}`}>
        {editing && (
          <TransactionForm
            initial={editing}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
