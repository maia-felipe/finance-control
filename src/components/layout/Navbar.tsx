import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, TrendingUp,
  Target, Star, Settings, BarChart3, Menu, LogOut, Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TFunction } from 'i18next'
import { MonthSelector } from './MonthSelector'
import { MoreSheet } from './MoreSheet'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useAuth } from '../../contexts/AuthContext'

type Tab = 'dashboard' | 'expenses' | 'income' | 'investments' | 'budget' | 'wishlist' | 'settings' | 'reports'

interface NavbarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  month: string
  onMonthChange: (month: string) => void
}

interface TabDef {
  id: Tab
  label: string
  shortLabel: string
  icon: LucideIcon
}

const TAB_ICONS: Record<Tab, LucideIcon> = {
  dashboard: LayoutDashboard,
  expenses: ArrowDownCircle,
  income: ArrowUpCircle,
  investments: TrendingUp,
  budget: Target,
  wishlist: Star,
  settings: Settings,
  reports: BarChart3,
}

// 'settings' de propósito fora da lista: não é uma aba, abre pelo email da
// conta (desktop) ou pelo rodapé do sheet "Mais" (mobile).
const TAB_ORDER: Tab[] = [
  'dashboard', 'expenses', 'income', 'investments', 'budget', 'wishlist', 'reports',
]

// Mobile: 4 abas principais na barra inferior; o resto vai para o sheet "Mais"
const PRIMARY_TABS: Tab[] = ['dashboard', 'expenses', 'income', 'investments']

function buildTabs(t: TFunction): TabDef[] {
  return TAB_ORDER.map(id => ({
    id,
    label: t(`nav.${id}`),
    shortLabel: t(`nav.${id}Short`),
    icon: TAB_ICONS[id],
  }))
}

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-soft text-accent">
        <Wallet size={16} />
      </span>
      <span className="text-base md:text-lg font-bold text-content tracking-tight">FinanControl</span>
    </span>
  )
}

export function Navbar({ activeTab, onTabChange, month, onMonthChange }: NavbarProps) {
  const { user, signOut } = useAuth()
  const { t } = useTranslation()
  const [moreOpen, setMoreOpen] = useState(false)

  const tabs = buildTabs(t)
  const primaryTabs = tabs.filter(tab => PRIMARY_TABS.includes(tab.id))
  const secondaryTabs = tabs.filter(tab => !PRIMARY_TABS.includes(tab.id))

  const activeSecondary = secondaryTabs.find(tab => tab.id === activeTab)
  const settingsActive = activeTab === 'settings'
  // Configurações também mora atrás do "Mais" no mobile, então conta como ativo.
  const MoreIcon = activeSecondary?.icon ?? (settingsActive ? Settings : Menu)

  return (
    <>
      {/* Desktop navbar */}
      <header className="hidden md:flex items-center justify-between gap-4 bg-surface border-b border-border-subtle px-6 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="mr-4 flex-shrink-0"><Logo /></span>
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-accent-soft text-accent'
                    : 'text-content-2 hover:bg-surface-2'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <MonthSelector month={month} onChange={onMonthChange} />
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-border-subtle">
<<<<<<< HEAD
              <span className="text-xs text-content-2 truncate max-w-45" title={user.email ?? ''}>{user.email}</span>
=======
              <button
                onClick={() => onTabChange('settings')}
                title={t('settings.title')}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer max-w-52 ${
                  settingsActive ? 'bg-accent-soft text-accent' : 'text-content-2 hover:bg-surface-2'
                }`}
              >
                <Settings size={14} className="flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </button>
>>>>>>> dev
              <button
                onClick={signOut}
                title={t('common.signOut')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-content-2 whitespace-nowrap hover:border-danger/30 hover:text-danger hover:bg-danger-soft transition cursor-pointer"
              >
                <LogOut size={14} />
                {t('common.signOut')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between bg-surface border-b border-border-subtle px-4 py-3 sticky top-0 z-40">
        <Logo />
        <div className="flex items-center gap-2">
          <MonthSelector month={month} onChange={onMonthChange} />
          <ThemeToggle />
          {user && (
            <button
              onClick={signOut}
              title={t('common.signOut')}
              aria-label={t('common.signOut')}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-content-2 hover:border-danger/30 hover:text-danger hover:bg-danger-soft transition cursor-pointer"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border-subtle z-40 flex pb-[env(safe-area-inset-bottom)]">
        {primaryTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-12 text-[11px] font-medium transition cursor-pointer ${
                activeTab === tab.id ? 'text-accent' : 'text-content-2'
              }`}
            >
              <Icon size={20} />
              {tab.shortLabel}
            </button>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-12 text-[11px] font-medium transition cursor-pointer ${
            activeSecondary || settingsActive ? 'text-accent' : 'text-content-2'
          }`}
        >
          <MoreIcon size={20} />
          {activeSecondary?.shortLabel ?? (settingsActive ? t('nav.settingsShort') : t('common.more'))}
        </button>
      </nav>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={secondaryTabs}
        activeTab={activeTab}
        onSelect={onTabChange}
        userEmail={user?.email}
        settingsActive={settingsActive}
      />
    </>
  )
}

export type { Tab }
