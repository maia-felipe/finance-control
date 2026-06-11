import { useSyncExternalStore } from 'react'
import { subscribeToasts, getToasts, dismissToast } from '../../lib/toast'
import type { ToastType } from '../../lib/toast'

const STYLES: Record<ToastType, string> = {
  error: 'bg-red-50 border-red-200 text-red-700',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  info: 'bg-indigo-50 border-indigo-200 text-indigo-700',
}

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-start gap-3 border rounded-lg shadow-md px-4 py-3 ${STYLES[t.type]}`}
        >
          <p className="flex-1 text-sm">{t.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="text-current opacity-60 hover:opacity-100 cursor-pointer leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
