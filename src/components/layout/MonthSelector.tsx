import { format, addMonths, parseISO, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthSelectorProps {
  month: string
  onChange: (month: string) => void
}

export function MonthSelector({ month, onChange }: MonthSelectorProps) {
  const date = parseISO(`${month}-01`)
  const label = format(date, 'MMMM yyyy', { locale: ptBR })

  const prev = () => onChange(format(subMonths(date, 1), 'yyyy-MM'))
  const next = () => onChange(format(addMonths(date, 1), 'yyyy-MM'))

  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} className="p-1 rounded-lg hover:bg-slate-100 transition text-slate-500 cursor-pointer">‹</button>
      <span className="text-sm font-medium text-slate-700 capitalize w-36 text-center">{label}</span>
      <button onClick={next} className="p-1 rounded-lg hover:bg-slate-100 transition text-slate-500 cursor-pointer">›</button>
    </div>
  )
}
