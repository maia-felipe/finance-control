import type { CSSProperties } from 'react'
import { useTheme } from '../contexts/ThemeContext'

// Cores dos gráficos (Recharts recebe cores via props, então precisam vir de
// estado React — não de getComputedStyle — para re-renderizar ao trocar o tema)
interface ChartTheme {
  grid: string
  tick: string
  tooltip: CSSProperties
  income: string
  expense: string
  invested: string
  planned: string
  balance: string
}

const light: ChartTheme = {
  grid: '#f1f5f9',
  tick: '#94a3b8',
  tooltip: { borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12, backgroundColor: '#ffffff' },
  income: '#10b981',
  expense: '#6366f1',
  invested: '#8b5cf6',
  planned: '#d9a514',
  balance: '#f59e0b',
}

const dark: ChartTheme = {
  grid: '#1e293b',
  tick: '#64748b',
  tooltip: { borderRadius: 12, border: '1px solid #283548', fontSize: 12, backgroundColor: '#111a2b', color: '#e2e8f0' },
  income: '#34d399',
  expense: '#818cf8',
  invested: '#a78bfa',
  planned: '#fbbf24',
  balance: '#fbbf24',
}

export function useChartTheme(): ChartTheme {
  return useTheme().resolved === 'dark' ? dark : light
}
