import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'node' | 'browser' | 'ai' | 'default'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant === 'default' ? '' : variant}`}>
      {children}
    </span>
  )
}
