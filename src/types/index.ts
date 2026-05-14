export type TransactionType = 'income' | 'expense' | 'investment'

export type CategoryType = 'income' | 'expense' | 'investment' | 'both'

export interface Category {
  id: string
  name: string
  type: CategoryType
  color: string
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

export type InvestmentCategory = 'Renda Fixa' | 'Ações' | 'FII' | 'Cripto' | 'Outro'

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
  purchased: boolean
  purchasedAt?: string
  transactionId?: string   // id da transação criada quando marcou como comprado
  notes?: string
  createdAt: string
}
