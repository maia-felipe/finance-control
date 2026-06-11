import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { UpdatePasswordPage } from './components/auth/UpdatePasswordPage'
import { Toaster } from './components/ui/Toaster'
import { Navbar } from './components/layout/Navbar'
import type { Tab } from './components/layout/Navbar'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { TransactionsPage } from './components/transactions/TransactionsPage'
import { BudgetPage } from './components/budget/BudgetPage'
import { CategoriesPage } from './components/categories/CategoriesPage'
import { ReportsPage } from './components/reports/ReportsPage'
import { InvestmentsPage } from './components/investments/InvestmentsPage'
import { WishlistPage } from './components/wishlist/WishlistPage'
import { currentMonth } from './utils/formatDate'

function AppContent() {
  const { user, loading, passwordRecovery } = useAuth()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [month, setMonth] = useState(currentMonth())

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    )
  }

  if (passwordRecovery) return <UpdatePasswordPage />

  if (!user) return <AuthPage />

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar activeTab={tab} onTabChange={setTab} month={month} onMonthChange={setMonth} />
      <main className="pb-20 md:pb-6">
        {tab === 'dashboard' && <DashboardPage month={month} />}
        {tab === 'expenses' && <TransactionsPage month={month} type="expense" onMonthChange={setMonth} />}
        {tab === 'income' && <TransactionsPage month={month} type="income" onMonthChange={setMonth} />}
        {tab === 'investments' && <InvestmentsPage month={month} onMonthChange={setMonth} />}
        {tab === 'budget' && <BudgetPage month={month} />}
        {tab === 'wishlist' && <WishlistPage />}
        {tab === 'categories' && <CategoriesPage />}
        {tab === 'reports' && <ReportsPage month={month} />}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  )
}

export default App
