import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { pushModal, popModal } from '../../lib/modalStack'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Registra no stack global para que atalhos de teclado saibam que há um
  // diálogo aberto.
  useEffect(() => {
    if (!open) return
    pushModal()
    return popModal
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-content">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-content-3 hover:text-content-2 transition cursor-pointer p-0.5"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
