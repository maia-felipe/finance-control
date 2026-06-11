import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type ThemePref = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  pref: ThemePref
  resolved: ResolvedTheme
  setPref: (pref: ThemePref) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'fc_theme'
// Cores do meta theme-color (status bar do PWA) por tema
const META_COLOR: Record<ResolvedTheme, string> = { light: '#4f46e5', dark: '#0b1120' }

function readPref(): ThemePref {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch { /* localStorage indisponível */ }
  return 'system'
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useState<ThemePref>(readPref)
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    pref === 'system' ? systemTheme() : pref
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, pref)
    } catch { /* localStorage indisponível */ }

    const apply = (theme: ResolvedTheme) => {
      setResolved(theme)
      document.documentElement.classList.toggle('dark', theme === 'dark')
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
    }

    if (pref !== 'system') {
      apply(pref)
      return
    }

    apply(systemTheme())
    // Em modo sistema, segue mudanças do SO em tempo real
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  return (
    <ThemeContext.Provider value={{ pref, resolved, setPref }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export type { ThemePref, ResolvedTheme }
