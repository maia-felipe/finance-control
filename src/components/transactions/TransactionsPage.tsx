import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Repeat } from 'lucide-react'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import type { Transaction, TransactionType } from '../../types'
import { Card } from '../ui/Card'
import { CategoryIcon } from '../ui/CategoryIcon'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TransactionForm } from './TransactionForm'
import { ImportModal } from './ImportModal'
import { formatDate, monthFromDate } from '../../utils/formatDate'
import { useMoney } from '../../hooks/useMoney'
import { subscribeQuickAdd } from '../../lib/quickAdd'

interface TransactionsPageProps {
  month: string
  type: TransactionType
  onMonthChange: (month: string) => void
}

export function TransactionsPage({ month, type, onMonthChange }: TransactionsPageProps) {
  const { t } = useTranslation()
  const money = useMoney()
  const { transactions, getByMonth, addTransaction, updateTransaction, deleteTransaction } = useTransactions()
  const { getCategoryById, categories } = useCategories()
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')

  // Atalho de teclado (tecla N, disparado pelo App): só a aba cujo tipo bate
  // com o pedido abre o formulário.
  useEffect(() => subscribeQuickAdd(requested => {
    if (requested !== type) return false
    setShowAdd(true)
    return true
  }), [type])

  const isExpense = type === 'expense'
  const title = isExpense ? t('transactions.expensesTitle') : t('transactions.incomeTitle')
  const emptyMsg = isExpense ? t('transactions.noExpenses') : t('transactions.noIncome')
  const addLabel = isExpense ? t('transactions.newExpense') : t('transactions.newIncome')
  const modalTitle = isExpense ? t('transactions.newExpenseModal') : t('transactions.newIncomeModal')
  const editTitle = isExpense ? t('transactions.editExpense') : t('transactions.editIncome')

  const relevantCategories = categories.filter(c => c.type === type || c.type === 'both')

  const filtered = getByMonth(month)
    .filter(tx => tx.type === type)
    .filter(tx => !filterCategory || tx.categoryId === filterCategory)
    .filter(tx => !search || tx.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))

  const total = filtered.reduce((sum, tx) => sum + tx.convertedAmount, 0)

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
          <h1 className="text-2xl font-bold tracking-tight text-content">{title}</h1>
          <p className={`text-sm font-semibold mt-0.5 ${isExpense ? 'text-content-2' : 'text-success'}`}>
            {isExpense ? '-' : '+'}{money.format(total)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>{t('transactions.import')}</Button>
          <Button onClick={() => setShowAdd(true)}>{addLabel}</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder={t('transactions.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-border bg-surface text-content placeholder:text-content-3 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-32 outline-none focus:border-accent"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-surface text-content outline-none focus:border-accent"
        >
          <option value="">{t('transactions.allCategories')}</option>
          {relevantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <Card className="!p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-content-3 text-center py-12">{emptyMsg}</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered.map(tx => {
              const cat = getCategoryById(tx.categoryId)
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon icon={cat?.icon} color={cat?.color ?? '#6b7280'} />
                    <div className="min-w-0">
                      {/* Descrição é opcional: sem ela, a categoria vira o título
                          da linha (e sai do subtítulo, para não repetir). */}
                      <p className="text-sm font-medium text-content truncate">{tx.description || cat?.name || '—'}</p>
                      <p className="text-xs text-content-3">
                        {formatDate(tx.date)}
                        {tx.description ? <> · {cat?.name ?? '—'}</> : null}
                        {tx.recurring && <> · <Repeat size={11} className="inline" aria-label={t('common.recurring')} /></>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className={`text-sm font-semibold text-right ${isExpense ? 'text-content' : 'text-success'}`}>
                      {isExpense ? '-' : '+'}{money.formatIn(tx.amount, tx.currency)}
                      {tx.currency !== money.preferredCurrency && (
                        <span className="block text-xs font-normal text-content-3">
                          ≈ {money.format(tx.convertedAmount)}
                        </span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(tx)} aria-label={t('common.edit')} title={t('common.edit')}><Pencil size={14} /></Button>
                      <Button size="sm" variant="danger" onClick={() => deleteTransaction(tx.id)} aria-label={t('common.delete')} title={t('common.delete')}><Trash2 size={14} /></Button>
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

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editTitle}>
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
