import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  title?: string
  description?: string
  action?: ReactNode
}

export function Card({ children, className = '', title, description, action, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-surface-200 bg-white p-4 shadow-card transition-all duration-300 hover:shadow-elevated md:p-5",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between md:mb-5">
          <div>
            {title && <h3 className="text-base font-bold tracking-tight text-ink-900 md:text-lg">{title}</h3>}
            {description && <p className="mt-1 text-xs text-ink-500 md:text-sm">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
