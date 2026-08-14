import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { subscribeToasts, getToasts, dismissToast } from '../../lib/toast'
import type { ToastType } from '../../lib/toast'

const STYLES: Record<ToastType, string> = {
  error: 'bg-danger-soft border-danger/25 text-danger',
  success: 'bg-success-soft border-success/25 text-success',
  info: 'bg-accent-soft border-accent/25 text-accent',
}

export function Toaster() {
  const { t } = useTranslation()
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map(toastItem => (
        <div
          key={toastItem.id}
          role="alert"
          className={`flex items-start gap-3 border rounded-lg shadow-md px-4 py-3 ${STYLES[toastItem.type]}`}
        >
          <p className="flex-1 text-sm">{toastItem.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toastItem.id)}
            className="text-current opacity-60 hover:opacity-100 cursor-pointer leading-none"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
