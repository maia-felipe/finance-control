export type TransactionType = 'income' | 'expense' | 'investment'

/**
 * Código ISO 4217 alpha-3 (BRL, USD, EUR…). Não é uma união fechada: a lista
 * vem da API de câmbio em runtime (ver src/lib/fx.ts), então acrescentar uma
 * moeda não exige mudança de tipo nem migração.
 */
export type CurrencyCode = string

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
  /** Valor na moeda em que a transação foi feita — sempre positivo. */
  amount: number
  /** Moeda deste lançamento. A conversão para a moeda preferida usa a cotação
   *  da própria `date`, então o valor convertido nunca muda depois. */
  currency: CurrencyCode
  type: TransactionType
  categoryId: string
  /** Opcional: string vazia quando não informada (a categoria vira o rótulo). */
  description: string
  recurring: boolean
  investmentId?: string
  installmentGroupId?: string
}

export interface Budget {
  month: string
  totalLimit: number
  categoryLimits: Record<string, number>
  currency: CurrencyCode
}

/**
 * Chaves estáveis e independentes de idioma — o rótulo exibido vem do i18n
 * (`investments.categories.*`). Os valores antigos em português foram migrados
 * por supabase/currency.sql.
 */
export type InvestmentCategory = 'fixed_income' | 'stocks' | 'reits' | 'crypto' | 'fx' | 'other'

export const INVESTMENT_CATEGORIES: InvestmentCategory[] = [
  'fixed_income', 'stocks', 'reits', 'crypto', 'fx', 'other',
]

export interface Investment {
  id: string
  name: string
  category: InvestmentCategory
  amountInvested: number
  currentValue: number
  /** Moeda em que a posição é acompanhada — a moeda com que você pagou. */
  currency: CurrencyCode
  startDate: string
  lastUpdated: string
  color: string
  notes: string
  /** Para investimentos de câmbio ('fx'): quantidade de moeda/unidades mantidas. */
  quantity?: number
  /**
   * Só para 'fx': a moeda efetivamente mantida (`quantity` está nesta moeda).
   * É o que permite marcar a mercado — sem ela, `currentValue` seria um número
   * digitado à mão que envelhece no dia seguinte.
   */
  holdingCurrency?: CurrencyCode
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
  currency: CurrencyCode
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
