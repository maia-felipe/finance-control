import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface rounded-2xl border border-border-subtle shadow-sm dark:shadow-none p-5 ${className}`}>
      {children}
    </div>
  )
}
