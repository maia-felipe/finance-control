// Store de toasts em nível de módulo (pub/sub) — permite disparar avisos de
// qualquer lugar (hooks, helpers fora do React) sem prop drilling ou contexto.

export type ToastType = 'error' | 'success' | 'info'

export interface ToastData {
  id: number
  type: ToastType
  message: string
}

const AUTO_DISMISS_MS = 6000

let toasts: ToastData[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(l => l())
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToasts(): ToastData[] {
  return toasts
}

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

function show(type: ToastType, message: string) {
  // Evita empilhar avisos idênticos (ex.: várias gravações falhando pela mesma causa)
  if (toasts.some(t => t.type === type && t.message === message)) return
  const id = nextId++
  toasts = [...toasts, { id, type, message }]
  emit()
  setTimeout(() => dismissToast(id), AUTO_DISMISS_MS)
}

export const toast = {
  error: (message: string) => show('error', message),
  success: (message: string) => show('success', message),
  info: (message: string) => show('info', message),
}
