// Canal pub/sub para o atalho de teclado "nova transação" (tecla N).
//
// Por que pub/sub e não um modal global no App: cada chamada de useTransactions
// tem seu próprio estado local. Se o App montasse o hook para inserir a
// transação, a página aberta (que montou outra instância) só veria o novo
// lançamento no próximo refetch. Emitindo um evento, quem abre o modal é a
// própria página — usando a mesma instância do hook que renderiza a lista.
//
// Mesmo padrão de src/lib/toast.ts.

import type { TransactionType } from '../types'

/** Retorna true se tratou o pedido (a aba do tipo certo estava montada). */
type Listener = (type: TransactionType) => boolean

const listeners = new Set<Listener>()

// Quando o atalho é acionado fora das abas de transação, a página de destino
// ainda não montou. O pedido fica pendurado aqui e é consumido pelo primeiro
// assinante compatível. O TTL evita que um pedido órfão abra um modal
// inesperado muito tempo depois.
const PENDING_TTL_MS = 2000
let pending: { type: TransactionType; at: number } | null = null

export function subscribeQuickAdd(listener: Listener): () => void {
  listeners.add(listener)
  if (pending && Date.now() - pending.at < PENDING_TTL_MS && listener(pending.type)) {
    pending = null
  }
  return () => {
    listeners.delete(listener)
  }
}

/** Pede que o formulário de nova transação abra, agora ou ao montar a aba. */
export function requestQuickAdd(type: TransactionType) {
  for (const listener of listeners) {
    if (listener(type)) return
  }
  pending = { type, at: Date.now() }
}

/** true quando o foco está num campo editável — o atalho deve ser ignorado. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
