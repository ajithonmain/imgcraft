import type { ReactNode } from 'react'
import { Info, AlertTriangle, Lightbulb } from 'lucide-react'

interface CalloutProps {
  type?: 'info' | 'warning' | 'tip'
  children: ReactNode
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  tip: Lightbulb,
}

export function Callout({ type = 'info', children }: CalloutProps) {
  const Icon = icons[type]
  return (
    <div className={`callout callout-${type}`}>
      <span className="callout-icon">
        <Icon size={16} />
      </span>
      <div>{children}</div>
    </div>
  )
}
