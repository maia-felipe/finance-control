import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TransactionType, WishlistItem } from '../../types'
import { useCategories } from '../../hooks/useCategories'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { todayISO } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

export interface PurchaseFormData {
  date: string
  amount: number
  type: TransactionType
  categoryId: string
  description: string
  installments: number          // 1 = compra simples; >1 = parcelada
  firstInstallmentDate: string  // só relevante se installments > 1 (senão usa `date`)
}

interface PurchaseFormProps {
  item: WishlistItem
  onSubmit: (data: PurchaseFormData) => void
  onCancel: () => void
}

export function PurchaseForm({ item, onSubmit, onCancel }: PurchaseFormProps) {
  const { categories } = useCategories()

  // Pré-seleciona a categoria de transação se o nome bater com a da wishlist
  const initialCategoryId = useMemo(() => {
    const match = categories.find(c => c.name === item.category)
    return match?.id ?? ''
  }, [categories, item.category])

  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState(item.price.toFixed(2))
  const [type] = useState<TransactionType>('expense')
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [description, setDescription] = useState(item.name)

  // Sincroniza a categoria pré-selecionada quando as categorias terminam de carregar
  // (na primeira render do form, `categories` pode estar vazio ainda).
  useEffect(() => {
    if (initialCategoryId) setCategoryId(initialCategoryId)
  }, [initialCategoryId])
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState(2)
  const [firstDate, setFirstDate] = useState(todayISO())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')

  const amountNum = parseFloat(amount) || 0
  const installmentValue = isInstallment && installments > 0 ? amountNum / installments : amountNum
  const lastDate = isInstallment ? addMonths(parseISO(firstDate), installments - 1) : null

  const validate = () => {
    const e: Record<string, string> = {}
    if (!date) e.date = 'Data é obrigatória'
    if (!amountNum || amountNum <= 0) e.amount = 'Valor inválido'
    if (!categoryId) e.categoryId = 'Selecione uma categoria'
    if (!description.trim()) e.description = 'Descrição é obrigatória'
    if (isInstallment) {
      if (installments < 2) e.installments = 'Use 2 ou mais parcelas'
      if (installments > 60) e.installments = 'Máximo 60 parcelas'
      if (!firstDate) e.firstDate = 'Data obrigatória'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      date: isInstallment ? firstDate : date,
      amount: amountNum,
      type,
      categoryId,
      description: description.trim(),
      installments: isInstallment ? installments : 1,
      firstInstallmentDate: isInstallment ? firstDate : date,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-content-2 -mt-1">
        Vamos registrar essa compra como gasto. Ajuste os detalhes antes de salvar.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Data da compra"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          error={errors.date}
          disabled={isInstallment}
        />
        <Input
          label="Valor total (R$)"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          error={errors.amount}
        />
      </div>

      <Select
        label="Categoria"
        value={categoryId}
        onChange={e => setCategoryId(e.target.value)}
        error={errors.categoryId}
      >
        <option value="">Selecione...</option>
        {filteredCategories.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      <Input
        label="Descrição"
        value={description}
        onChange={e => setDescription(e.target.value)}
        error={errors.description}
      />

      {/* Toggle parcelamento */}
      <div className="border-t border-border-subtle pt-4 flex flex-col gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isInstallment}
            onChange={e => setIsInstallment(e.target.checked)}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm font-medium text-content">Pagamento parcelado</span>
        </label>

        {isInstallment && (
          <div className="flex flex-col gap-3 pl-6 border-l-2 border-accent-soft">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Número de parcelas"
                type="number"
                min="2"
                max="60"
                step="1"
                value={installments}
                onChange={e => setInstallments(parseInt(e.target.value) || 0)}
                error={errors.installments}
              />
              <Input
                label="Primeira parcela em"
                type="date"
                value={firstDate}
                onChange={e => setFirstDate(e.target.value)}
                error={errors.firstDate}
              />
            </div>

            {installments >= 2 && firstDate && lastDate && (
              <div className="text-xs text-content-2 bg-accent-soft rounded-md px-3 py-2 flex flex-col gap-0.5">
                <span>
                  <strong className="text-accent">{formatCurrency(installmentValue)}</strong> × {installments} vezes
                </span>
                <span>
                  Última parcela: <strong className="capitalize">{format(lastDate, 'MMMM yyyy', { locale: ptBR })}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
