import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Tab } from './Navbar'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
  items: { id: Tab; label: string; icon: LucideIcon }[]
  activeTab: Tab
  onSelect: (tab: Tab) => void
}

export function MoreSheet({ open, onClose, items, activeTab, onSelect }: MoreSheetProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl shadow-xl w-full p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-10">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-semibold text-content">Mais opções</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-content-3 hover:text-content-2 transition cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map(item => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); onClose() }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  active ? 'bg-accent-soft text-accent' : 'text-content-2 hover:bg-surface-2'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
