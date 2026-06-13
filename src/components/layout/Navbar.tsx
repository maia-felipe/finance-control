import { useState } from 'react'
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, TrendingUp,
  Target, Star, Tags, BarChart3, Menu, LogOut, Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MonthSelector } from './MonthSelector'
import { MoreSheet } from './MoreSheet'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useAuth } from '../../contexts/AuthContext'

type Tab = 'dashboard' | 'expenses' | 'income' | 'investments' | 'budget' | 'wishlist' | 'categories' | 'reports'

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

const tabs: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Resumo', icon: LayoutDashboard },
  { id: 'expenses', label: 'Gastos', shortLabel: 'Gastos', icon: ArrowDownCircle },
  { id: 'income', label: 'Receitas', shortLabel: 'Receitas', icon: ArrowUpCircle },
  { id: 'investments', label: 'Investimentos', shortLabel: 'Investir', icon: TrendingUp },
  { id: 'budget', label: 'Orçamento', shortLabel: 'Orçamento', icon: Target },
  { id: 'wishlist', label: 'Desejos', shortLabel: 'Desejos', icon: Star },
  { id: 'categories', label: 'Categorias', shortLabel: 'Categorias', icon: Tags },
  { id: 'reports', label: 'Relatórios', shortLabel: 'Relatórios', icon: BarChart3 },
]

// Mobile: 4 abas principais na barra inferior; o resto vai para o sheet "Mais"
const PRIMARY_TABS: Tab[] = ['dashboard', 'expenses', 'income', 'investments']
const primaryTabs = tabs.filter(t => PRIMARY_TABS.includes(t.id))
const secondaryTabs = tabs.filter(t => !PRIMARY_TABS.includes(t.id))

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
  const [moreOpen, setMoreOpen] = useState(false)

  const activeSecondary = secondaryTabs.find(t => t.id === activeTab)
  const MoreIcon = activeSecondary?.icon ?? Menu

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
              <span className="text-xs text-content-2 truncate max-w-45" title={user.email ?? ''}>{user.email}</span>
              <button
                onClick={signOut}
                title="Sair da conta"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-content-2 hover:border-danger/30 hover:text-danger hover:bg-danger-soft transition cursor-pointer"
              >
                <LogOut size={14} />
                Sair
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
              title="Sair da conta"
              aria-label="Sair"
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
            activeSecondary ? 'text-accent' : 'text-content-2'
          }`}
        >
          <MoreIcon size={20} />
          {activeSecondary?.shortLabel ?? 'Mais'}
        </button>
      </nav>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={secondaryTabs}
        activeTab={activeTab}
        onSelect={onTabChange}
      />
    </>
  )
}

export type { Tab }
