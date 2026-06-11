import type { Transaction } from '../types'
import { generateId } from '../utils/generateId'

// Limite de meses preenchidos retroativamente por série (ex.: app fechado
// por muito tempo) — evita criação em massa descontrolada.
const MAX_GAP_MONTHS = 12

function seriesKey(t: Transaction): string {
  return `${t.type}|${t.categoryId}|${t.description.trim().toLowerCase()}`
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

// Mantém o dia da ocorrência original, ajustado ao tamanho do mês (31 → 30/28).
function dateInMonth(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

// Motor de recorrência: uma "série" é o conjunto de transações com
// recurring = true e mesma chave (tipo + categoria + descrição). Para cada
// série cuja última ocorrência está num mês passado, materializa uma cópia
// em cada mês faltante até o mês alvo (inclusive). As cópias herdam o valor
// da ocorrência mais recente e continuam recorrentes — a série segue até o
// usuário desmarcar "recorrente" ou excluir a última cópia.
export function materializeRecurring(transactions: Transaction[], targetMonth: string): Transaction[] {
  const latestBySeries = new Map<string, Transaction>()
  for (const t of transactions) {
    // Transações de investimento e parcelas de compras têm ciclo próprio
    if (!t.recurring || t.investmentId || t.installmentGroupId) continue
    const key = seriesKey(t)
    const prev = latestBySeries.get(key)
    if (!prev || t.date > prev.date) latestBySeries.set(key, t)
  }

  const created: Transaction[] = []
  for (const latest of latestBySeries.values()) {
    const day = Number(latest.date.slice(8, 10))
    let month = nextMonth(latest.date.slice(0, 7))
    let gap = 0
    while (month <= targetMonth && gap < MAX_GAP_MONTHS) {
      created.push({
        ...latest,
        id: generateId(),
        date: dateInMonth(month, day),
      })
      month = nextMonth(month)
      gap++
    }
  }
  return created
}
