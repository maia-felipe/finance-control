import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { enUS, ptBR as ptBRDate, es as esDate } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'
import { en } from './locales/en'
import { ptBR } from './locales/pt-BR'
import { es } from './locales/es'

export const LOCALES = ['en', 'pt-BR', 'es'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
}

// Locales do date-fns, para formatação de datas fora do i18next.
const DATE_LOCALES: Record<Locale, DateFnsLocale> = {
  en: enUS,
  'pt-BR': ptBRDate,
  es: esDate,
}

// Espelhado no localStorage para que idioma e formatos apliquem antes do
// primeiro round-trip com o Supabase (o valor autoritativo vive em
// user_settings; ver src/contexts/SettingsContext.tsx).
export const LOCALE_STORAGE_KEY = 'fc_locale'

export const DEFAULT_LOCALE: Locale = 'en'

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Idioma salvo, ou o mais próximo do idioma do navegador, ou inglês. */
export function initialLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (isLocale(stored)) return stored

  for (const candidate of navigator.languages ?? [navigator.language]) {
    if (isLocale(candidate)) return candidate
    // 'pt', 'pt-PT' → 'pt-BR'; 'es-AR' → 'es'
    const base = candidate.split('-')[0]
    const match = LOCALES.find(l => l.split('-')[0] === base)
    if (match) return match
  }
  return DEFAULT_LOCALE
}

export function currentLocale(): Locale {
  return isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE
}

export function dateLocale(): DateFnsLocale {
  return DATE_LOCALES[currentLocale()]
}

export async function changeLocale(locale: Locale) {
  if (i18n.language === locale) return
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  await i18n.changeLanguage(locale)
}

i18n.on('languageChanged', lng => {
  if (isLocale(lng)) document.documentElement.lang = lng
})

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'pt-BR': { translation: ptBR },
    es: { translation: es },
  },
  lng: initialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  // React já escapa tudo que renderiza.
  interpolation: { escapeValue: false },
})

export default i18n
