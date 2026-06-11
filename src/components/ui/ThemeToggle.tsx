import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { ThemePref } from '../../contexts/ThemeContext'

const NEXT: Record<ThemePref, ThemePref> = { light: 'dark', dark: 'system', system: 'light' }
const LABEL: Record<ThemePref, string> = { light: 'Claro', dark: 'Escuro', system: 'Sistema' }

export function ThemeToggle() {
  const { pref, setPref } = useTheme()
  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : Monitor

  return (
    <button
      onClick={() => setPref(NEXT[pref])}
      title={`Tema: ${LABEL[pref]}`}
      aria-label={`Tema: ${LABEL[pref]}`}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-content-2 hover:bg-surface-2 transition cursor-pointer"
    >
      <Icon size={15} />
    </button>
  )
}
