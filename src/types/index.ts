export type TransactionType = 'income' | 'expense' | 'investment'

export type Plan = 'trial' | 'free' | 'premium'

export type UserRole = 'user' | 'tester' | 'admin'

export interface Profile {
  plan: Plan
  role: UserRole
  trialEndsAt: string
  stripeCustomerId?: string
}

export type CategoryType = 'income' | 'expense' | 'investment' | 'both'

export interface Category {
  id: string
  name: string
  type: CategoryType
  color: string
  /** Nome do ícone (kebab-case) do registro em src/lib/categoryIcons.ts */
  icon?: string
  excludeFromCharts?: boolean
  subcategories?: string[]
}

export interface Transaction {
  id: string
  date: string
  amount: number
  type: TransactionType
  categoryId: string
  description: string
  recurring: boolean
  investmentId?: string
  installmentGroupId?: string
}

export interface Budget {
  month: string
  totalLimit: number
  categoryLimits: Record<string, number>
}

export type InvestmentCategory = 'Renda Fixa' | 'Ações' | 'FII' | 'Cripto' | 'Câmbio' | 'Outro'

export interface Investment {
  id: string
  name: string
  category: InvestmentCategory
  amountInvested: number
  currentValue: number
  startDate: string
  lastUpdated: string
  color: string
  notes: string
  /** Para investimentos de Câmbio: quantidade de moeda/unidades mantidas. */
  quantity?: number
}

export interface MonthSummary {
  month: string
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface WishlistItem {
  id: string
  name: string
  url?: string
  price: number
  category?: string        // ex: "Compras pessoais"
  subcategory?: string     // ex: "Tech"
  priority: number         // 1 a 5
  plannedInstallments: number  // parcelas planejadas (1 = à vista)
  purchased: boolean
  purchasedAt?: string
  transactionId?: string   // id da transação criada quando marcou como comprado
  notes?: string
  createdAt: string
}
