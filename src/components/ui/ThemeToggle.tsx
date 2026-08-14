import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../contexts/ThemeContext'
import type { ThemePref } from '../../contexts/ThemeContext'

const NEXT: Record<ThemePref, ThemePref> = { light: 'dark', dark: 'system', system: 'light' }

export function ThemeToggle() {
  const { pref, setPref } = useTheme()
  const { t } = useTranslation()
  const label = t('theme.label', { mode: t(`theme.${pref}`) })
  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : Monitor

  return (
    <button
      onClick={() => setPref(NEXT[pref])}
      title={label}
      aria-label={label}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-content-2 hover:bg-surface-2 transition cursor-pointer"
    >
      <Icon size={15} />
    </button>
  )
}
