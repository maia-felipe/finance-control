import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatDate = (isoDate: string) =>
  format(parseISO(isoDate), 'dd/MM/yyyy', { locale: ptBR })

export const formatMonth = (month: string) => {
  const [year, m] = month.split('-')
  return format(new Date(Number(year), Number(m) - 1, 1), 'MMMM yyyy', { locale: ptBR })
}

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')

export const currentMonth = () => format(new Date(), 'yyyy-MM')

export const monthFromDate = (isoDate: string) => isoDate.slice(0, 7)
