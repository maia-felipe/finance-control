import type { Transaction, Category } from '../types'
import { formatDate } from './formatDate'
import { formatCurrency } from './formatCurrency'

export const exportToCSV = (transactions: Transaction[], categories: Category[], filename: string) => {
  const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']
  const rows = transactions.map(t => {
    const cat = categories.find(c => c.id === t.categoryId)
    return [
      formatDate(t.date),
      t.type === 'income' ? 'Receita' : t.type === 'investment' ? 'Investimento' : 'Gasto',
      cat?.name ?? '',
      t.description,
      formatCurrency(t.amount),
    ]
  })

  const csv = [header, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
