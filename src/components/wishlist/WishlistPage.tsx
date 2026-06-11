import { useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { Check, Pencil, Trash2, Undo2, ExternalLink } from 'lucide-react'
import { useWishlist } from '../../hooks/useWishlist'
import { useTransactions } from '../../hooks/useTransactions'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../utils/formatCurrency'
import { generateId } from '../../utils/generateId'
import { StarRating } from './StarRating'
import { WishlistForm } from './WishlistForm'
import { PurchaseForm } from './PurchaseForm'
import { WishlistInsights } from './WishlistInsights'
import { AiInsightCard } from '../insights/AiInsightCard'
import { currentMonth } from '../../utils/formatDate'
import type { PurchaseFormData } from './PurchaseForm'
import type { WishlistItem } from '../../types'

const ROOT_SUB_KEY = '__root__'

export function WishlistPage() {
  const { items, loading, addItem, updateItem, deleteItem } = useWishlist()
  const { transactions, addTransaction, removeByPurchaseRef, getCumulativeBalance } = useTransactions()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<WishlistItem | null>(null)
  const [markingPurchased, setMarkingPurchased] = useState<WishlistItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const thisMonth = useMemo(() => format(new Date(), 'yyyy-MM'), [])
  const availableBalance = getCumulativeBalance(thisMonth)
  const selectedItems = useMemo(
    () => items.filter(i => !i.purchased && selectedIds.has(i.id)),
    [items, selectedIds]
  )
  const selectedTotal = selectedItems.reduce((s, i) => s + i.price, 0)
  const selectedMonthlyTotal = selectedItems.reduce((s, i) => s + i.price / (i.plannedInstallments ?? 1), 0)
  const selectionFits = selectedMonthlyTotal <= availableBalance && selectedIds.size > 0

  const handleConfirmPurchase = (data: PurchaseFormData) => {
    if (!markingPurchased) return
    let purchaseRef: string

    if (data.installments === 1) {
      // Compra à vista — uma única transação
      const txId = addTransaction({
        date: data.date,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        description: data.description,
        recurring: false,
      })
      purchaseRef = txId
    } else {
      // Parcelado — N transações ligadas por installment_group_id
      const groupId = generateId()
      const firstDate = parseISO(data.firstInstallmentDate)
      const installmentValue = data.amount / data.installments
      for (let i = 0; i < data.installments; i++) {
        const date = format(addMonths(firstDate, i), 'yyyy-MM-dd')
        addTransaction({
          date,
          amount: installmentValue,
          type: data.type,
          categoryId: data.categoryId,
          description: `${data.description} (parcela ${i + 1}/${data.installments})`,
          recurring: false,
          installmentGroupId: groupId,
        })
      }
      purchaseRef = groupId
    }

    updateItem(markingPurchased.id, {
      purchased: true,
      purchasedAt: new Date().toISOString(),
      transactionId: purchaseRef,
    })
    setMarkingPurchased(null)
  }

  const handleUndoPurchase = (item: WishlistItem) => {
    // Remove transação única OU todas as parcelas (via installment_group_id)
    if (item.transactionId) removeByPurchaseRef(item.transactionId)
    updateItem(item.id, { purchased: false, purchasedAt: undefined, transactionId: undefined })
  }

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, WishlistItem[]>> = {}
    items.forEach(item => {
      const cat = item.category?.trim() || 'Sem categoria'
      const sub = item.subcategory?.trim() || ROOT_SUB_KEY
      if (!map[cat]) map[cat] = {}
      if (!map[cat][sub]) map[cat][sub] = []
      map[cat][sub].push(item)
    })
    Object.values(map).forEach(subs => {
      Object.values(subs).forEach(arr => {
        arr.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority
          return b.createdAt.localeCompare(a.createdAt)
        })
      })
    })
    return map
  }, [items])

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <p className="text-sm text-content-3 text-center py-10">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-content">Desejos</h1>
        <Button onClick={() => setShowAdd(true)}>+ Novo item</Button>
      </div>

      <WishlistInsights items={items} transactions={transactions} availableBalance={availableBalance} />

      <AiInsightCard type="wishlist" month={currentMonth()} title="Conselheiro de compras com IA" />

      {selectedIds.size > 0 && (
        <div className="sticky top-16 z-30 bg-surface border border-accent-soft rounded-xl shadow-sm px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-content">
              {selectedIds.size} item(s) — {formatCurrency(selectedMonthlyTotal)}/mês
              {selectedTotal !== selectedMonthlyTotal && (
                <span className="text-xs font-normal text-content-3 ml-1">(total: {formatCurrency(selectedTotal)})</span>
              )}
            </p>
            <p className={`text-xs mt-0.5 ${selectionFits ? 'text-success' : 'text-danger'}`}>
              {selectionFits
                ? `Cabe nesse mês (saldo: ${formatCurrency(availableBalance)})`
                : `Falta ${formatCurrency(selectedMonthlyTotal - availableBalance)}/mês (saldo: ${formatCurrency(availableBalance)})`}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setSelectedIds(new Set())}>
            Limpar
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-content-3 text-center py-10">
            Sua lista está vazia.<br />
            <span className="text-accent cursor-pointer" onClick={() => setShowAdd(true)}>Adicionar o primeiro item →</span>
          </p>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, subs]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-sm font-semibold text-content-2 uppercase tracking-wide mb-3">{cat}</h2>
            {Object.entries(subs).map(([sub, list]) => (
              <div key={sub} className={sub !== ROOT_SUB_KEY ? 'ml-3 mb-4' : 'mb-4'}>
                {sub !== ROOT_SUB_KEY && (
                  <h3 className="text-xs font-medium text-content-3 mb-2 flex items-center gap-1.5">
                    <span className="w-1 h-3 bg-border rounded-full" />
                    {sub}
                  </h3>
                )}
                <div className="flex flex-col gap-2">
                  {list.map(item => (
                    <Card key={item.id} className={item.purchased ? 'opacity-50' : ''}>
                      <div className="flex items-start justify-between gap-3">
                        {!item.purchased && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            className="mt-1 w-4 h-4 shrink-0 rounded accent-primary cursor-pointer"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <StarRating value={item.priority} />
                            <p className={`text-sm font-semibold ${item.purchased ? 'line-through text-content-3' : 'text-content'}`}>
                              {item.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium text-accent">{formatCurrency(item.price)}</span>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-content-2 hover:text-accent transition"
                              >
                                <ExternalLink size={11} /> link
                              </a>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-xs text-content-3 mt-1 italic">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {item.purchased ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUndoPurchase(item)}
                              title="Desfazer compra (remove a transação criada)"
                              aria-label="Desfazer compra"
                            >
                              <Undo2 size={14} />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setMarkingPurchased(item)}
                              title="Marcar como comprado e registrar gasto"
                              aria-label="Marcar como comprado"
                            >
                              <Check size={14} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(item)}
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => deleteItem(item.id)}
                            title="Remover item"
                            aria-label="Remover item"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo item">
        <WishlistForm
          onSubmit={data => { addItem(data); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar item">
        {editing && (
          <WishlistForm
            initial={editing}
            onSubmit={data => { updateItem(editing.id, data); setEditing(null) }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={!!markingPurchased}
        onClose={() => setMarkingPurchased(null)}
        title={markingPurchased ? `Registrar compra — ${markingPurchased.name}` : ''}
      >
        {markingPurchased && (
          <PurchaseForm
            item={markingPurchased}
            onSubmit={handleConfirmPurchase}
            onCancel={() => setMarkingPurchased(null)}
          />
        )}
      </Modal>
    </div>
  )
}
