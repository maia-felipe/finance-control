const OPTIONS = [3, 6, 12, 24] as const
export type Period = typeof OPTIONS[number]

interface PeriodSelectorProps {
  value: Period
  onChange: (p: Period) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
            value === opt
              ? 'bg-surface text-content shadow-sm'
              : 'text-content-2 hover:text-content'
          }`}
        >
          {opt}m
        </button>
      ))}
    </div>
  )
}
