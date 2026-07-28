import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon
  title: string
  body?: ReactNode
  action?: ReactNode
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-soft text-sky-bright">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-[16px] font-bold text-ink">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>}
      {action}
      {!action && actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
