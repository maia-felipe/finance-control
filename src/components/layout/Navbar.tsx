import { MonthSelector } from './MonthSelector'
import { useAuth } from '../../contexts/AuthContext'

type Tab = 'dashboard' | 'expenses' | 'income' | 'investments' | 'budget' | 'categories' | 'reports'

interface NavbarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  month: string
  onMonthChange: (month: string) => void
}

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
  { id: 'expenses', label: 'Gastos', emoji: '💸' },
  { id: 'income', label: 'Receitas', emoji: '💰' },
  { id: 'investments', label: 'Investimentos', emoji: '📈' },
  { id: 'budget', label: 'Orçamento', emoji: '🎯' },
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
              <span className="text-xs text-slate-500 truncate max-w-45" title={user.email ?? ''}>{user.email}</span>
              <button
                onClick={signOut}
                className="text-xs text-slate-500 hover:text-red-500 cursor-pointer transition"
              >
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
          <MonthSelector month={month} onChange={onMonthChange} />
          {user && (
            <button
              onClick={signOut}
              className="text-xs text-slate-500 hover:text-red-500 cursor-pointer pl-2 border-l border-slate-100"
            >
              Sair
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
