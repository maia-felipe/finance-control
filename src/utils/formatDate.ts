import { format, parseISO } from 'date-fns'
import { currentLocale, dateLocale } from '../i18n'

// Formatos de data por idioma: en-US usa mm/dd/yyyy, pt-BR e es usam dd/MM/yyyy.
const SHORT_DATE_FORMAT: Record<string, string> = {
  en: 'MM/dd/yyyy',
  'pt-BR': 'dd/MM/yyyy',
  es: 'dd/MM/yyyy',
}

export const formatDate = (isoDate: string) =>
  format(parseISO(isoDate), SHORT_DATE_FORMAT[currentLocale()], { locale: dateLocale() })

// pt-BR e es devolvem o nome do mês em minúsculas ("agosto"); em um título
// isso fica errado. Capitalizamos aqui em vez de espalhar `capitalize` no CSS
// de cada tela — e assim a string traduzida não precisa de markup.
const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export const formatMonth = (month: string) => {
  const [year, m] = month.split('-')
  return capitalizeFirst(
    format(new Date(Number(year), Number(m) - 1, 1), 'MMMM yyyy', { locale: dateLocale() }),
  )
}

/** Rótulo curto para eixos de gráfico ("Aug", "Ago"). */
export const formatMonthShort = (month: string) =>
  capitalizeFirst(format(parseISO(`${month}-01`), 'MMM', { locale: dateLocale() }))

/** Rótulo mês/ano compacto ("Aug/26"). */
export const formatMonthYearShort = (month: string) =>
  capitalizeFirst(format(parseISO(`${month}-01`), 'MMM/yy', { locale: dateLocale() }))

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')

export const currentMonth = () => format(new Date(), 'yyyy-MM')

export const monthFromDate = (isoDate: string) => isoDate.slice(0, 7)
