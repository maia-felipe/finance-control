import { format, addMonths, parseISO, subMonths } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dateLocale } from '../../i18n'

interface MonthSelectorProps {
  month: string
  onChange: (month: string) => void
}

export function MonthSelector({ month, onChange }: MonthSelectorProps) {
  const { t } = useTranslation()
  const date = parseISO(`${month}-01`)
  const label = format(date, 'MMMM yyyy', { locale: dateLocale() })

  const prev = () => onChange(format(subMonths(date, 1), 'yyyy-MM'))
  const next = () => onChange(format(addMonths(date, 1), 'yyyy-MM'))

  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} aria-label={t('common.previousMonth')} className="p-1 rounded-lg hover:bg-surface-2 transition text-content-2 cursor-pointer">
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium text-content capitalize w-36 text-center">{label}</span>
      <button onClick={next} aria-label={t('common.nextMonth')} className="p-1 rounded-lg hover:bg-surface-2 transition text-content-2 cursor-pointer">
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
