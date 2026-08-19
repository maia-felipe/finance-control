import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Settings, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Tab } from './Navbar'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
  items: { id: Tab; label: string; icon: LucideIcon }[]
  activeTab: Tab
  onSelect: (tab: Tab) => void
  /** No mobile o header não mostra o email, então a conta entra aqui no rodapé. */
  userEmail?: string | null
  settingsActive: boolean
}

export function MoreSheet({
  open, onClose, items, activeTab, onSelect, userEmail, settingsActive,
}: MoreSheetProps) {
  const { t } = useTranslation()

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
          <h2 className="text-sm font-semibold text-content">{t('common.moreOptions')}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
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

        {/* Conta — mesma semântica do desktop: toca no seu email, abre Configurações. */}
        <button
          onClick={() => { onSelect('settings'); onClose() }}
          className={`mt-2 w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition cursor-pointer border-t border-border-subtle rounded-t-none ${
            settingsActive ? 'bg-accent-soft text-accent' : 'text-content-2 hover:bg-surface-2'
          }`}
        >
          <Settings size={18} className="flex-shrink-0" />
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate">{userEmail ?? t('nav.settings')}</span>
            {userEmail && (
              <span className="block text-xs font-normal text-content-3">{t('settings.title')}</span>
            )}
          </span>
          <ChevronRight size={16} className="flex-shrink-0 text-content-3" />
        </button>
      </div>
    </div>
  )
}
