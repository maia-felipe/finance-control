import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', children, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-content-2">{label}</label>}
      <select
        ref={ref}
        className={`border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition bg-surface text-content ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
)

Select.displayName = 'Select'
