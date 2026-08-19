import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { FxProvider } from './contexts/FxContext'
import { AuthPage } from './components/auth/AuthPage'
import { UpdatePasswordPage } from './components/auth/UpdatePasswordPage'
import { Toaster } from './components/ui/Toaster'
import { Navbar } from './components/layout/Navbar'
import type { Tab } from './components/layout/Navbar'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { TransactionsPage } from './components/transactions/TransactionsPage'
import { BudgetPage } from './components/budget/BudgetPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { ReportsPage } from './components/reports/ReportsPage'
import { InvestmentsPage } from './components/investments/InvestmentsPage'
import { WishlistPage } from './components/wishlist/WishlistPage'
import { currentMonth } from './utils/formatDate'
import { requestQuickAdd, isTypingTarget } from './lib/quickAdd'
import { isAnyModalOpen } from './lib/modalStack'
import type { TransactionType } from './types'

// Abas que hospedam o formulário de transação e sabem responder ao atalho.
const QUICK_ADD_TABS: Record<'expense' | 'income', Tab> = {
  expense: 'expenses',
  income: 'income',
}

function AppContent() {
  const { user, loading, passwordRecovery } = useAuth()
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [month, setMonth] = useState(currentMonth())

  // Atalho: N abre "nova transação". Em Receitas cria receita; em qualquer
  // outra aba, cai em Gastos (o caso comum). Se a aba de destino ainda não
  // estiver montada, requestQuickAdd segura o pedido até ela assinar.
  useEffect(() => {
    if (!user) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'n' && e.key !== 'N') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target) || isAnyModalOpen()) return
      e.preventDefault()
      const type: TransactionType = tab === 'income' ? 'income' : 'expense'
      setTab(QUICK_ADD_TABS[type])
      requestQuickAdd(type)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [tab, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-content-2">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (passwordRecovery) return <UpdatePasswordPage />

  if (!user) return <AuthPage />

  return (
    <div className="min-h-screen">
      <Navbar activeTab={tab} onTabChange={setTab} month={month} onMonthChange={setMonth} />
      <main className="pb-24 md:pb-6">
        {tab === 'dashboard' && <DashboardPage month={month} />}
        {tab === 'expenses' && <TransactionsPage month={month} type="expense" onMonthChange={setMonth} />}
        {tab === 'income' && <TransactionsPage month={month} type="income" onMonthChange={setMonth} />}
        {tab === 'investments' && <InvestmentsPage month={month} onMonthChange={setMonth} />}
        {tab === 'budget' && <BudgetPage month={month} />}
        {tab === 'wishlist' && <WishlistPage />}
        {tab === 'settings' && <SettingsPage />}
        {tab === 'reports' && <ReportsPage month={month} />}
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* SettingsProvider depende do usuário; FxProvider, da moeda preferida. */}
        <SettingsProvider>
          <FxProvider>
            <AppContent />
            <Toaster />
          </FxProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
