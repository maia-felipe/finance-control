interface StarRatingProps {
  value: number                       // 1 a 5
  onChange?: (v: number) => void      // se undefined → modo readonly
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({ value, onChange, size = 'sm' }: StarRatingProps) {
  const interactive = !!onChange
  const sizeClass = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-2xl'
  const gapClass = size === 'lg' ? 'gap-1' : 'gap-0.5'

  return (
    <div className={`flex ${gapClass}`} aria-label={`Prioridade ${value} de 5`}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= value
        return interactive ? (
          <button
            key={i}
            type="button"
            onClick={() => onChange!(i)}
            className={`${sizeClass} leading-none cursor-pointer transition-colors ${
              filled ? 'text-warning' : 'text-border hover:text-warning'
            }`}
            aria-label={`Definir prioridade ${i}`}
          >
            ★
          </button>
        ) : (
          <span
            key={i}
            className={`${sizeClass} leading-none ${filled ? 'text-warning' : 'text-border'}`}
          >
            ★
          </span>
        )
      })}
    </div>
  )
}
