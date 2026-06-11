import { MonthSelector } from './MonthSelector'
import { PlanBadge } from './PlanBadge'
import { useAuth } from '../../contexts/AuthContext'

type Tab = 'dashboard' | 'expenses' | 'income' | 'investments' | 'budget' | 'wishlist' | 'categories' | 'reports'

interface NavbarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  month: string
  onMonthChange: (month: string) => void
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
  { id: 'expenses', label: 'Gastos', emoji: '💸' },
  { id: 'income', label: 'Receitas', emoji: '💰' },
  { id: 'investments', label: 'Investimentos', emoji: '📈' },
  { id: 'budget', label: 'Orçamento', emoji: '🎯' },
  { id: 'wishlist', label: 'Desejos', emoji: '⭐' },
  { id: 'categories', label: 'Categorias', emoji: '🏷️' },
  { id: 'reports', label: 'Relatórios', emoji: '📈' },
]

export function Navbar({ activeTab, onTabChange, month, onMonthChange }: NavbarProps) {
  const { user, signOut } = useAuth()
  return (
    <>
      {/* Desktop navbar */}
      <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-100 px-6 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-indigo-600 mr-4">💰 FinanControl</span>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector month={month} onChange={onMonthChange} />
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
              <PlanBadge />
              <span className="text-xs text-slate-500 truncate max-w-45" title={user.email ?? ''}>{user.email}</span>
              <button
                onClick={signOut}
                title="Sair da conta"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
              >
                <LogoutIcon />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-40">
        <span className="text-base font-bold text-indigo-600">💰 FinanControl</span>
        <div className="flex items-center gap-2">
          <PlanBadge />
          <MonthSelector month={month} onChange={onMonthChange} />
          {user && (
            <button
              onClick={signOut}
              title="Sair da conta"
              aria-label="Sair"
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition cursor-pointer ${
              activeTab === tab.id ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <div>{tab.emoji}</div>
            <div>{tab.label}</div>
          </button>
        ))}
      </nav>
    </>
  )
}

export type { Tab }
