import { getCategoryIcon } from '../../lib/categoryIcons'

interface CategoryIconProps {
  icon?: string
  color: string
  size?: 'sm' | 'md'
}

// Chip de ícone da categoria. O fundo usa color-mix com transparência para a
// cor do usuário (hex arbitrário) funcionar sobre superfícies claras e escuras.
export function CategoryIcon({ icon, color, size = 'md' }: CategoryIconProps) {
  const Icon = getCategoryIcon(icon)
  const box = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg'
  return (
    <span
      className={`flex items-center justify-center shrink-0 ${box}`}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      <Icon size={size === 'sm' ? 13 : 16} />
    </span>
  )
}
