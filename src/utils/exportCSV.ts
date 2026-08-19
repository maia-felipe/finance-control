import type { Transaction, Category } from '../types'
import { formatDate } from './formatDate'
import { formatMoney } from './formatCurrency'
import i18n from '../i18n'

export const exportToCSV = (transactions: Transaction[], categories: Category[], filename: string) => {
  const header = [
    i18n.t('csv.date'),
    i18n.t('csv.type'),
    i18n.t('csv.category'),
    i18n.t('csv.description'),
    i18n.t('csv.currency'),
    i18n.t('csv.amount'),
  ]
  const rows = transactions.map(t => {
    const cat = categories.find(c => c.id === t.categoryId)
    return [
      formatDate(t.date),
      i18n.t(`txType.${t.type}`),
      cat?.name ?? '',
      t.description,
      // O valor sai na moeda original do lançamento — exportar convertido
      // esconderia o dado real e dependeria da cotação do momento do export.
      t.currency,
      formatMoney(t.amount, t.currency),
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
