import type { HTMLAttributes, ReactNode } from 'react'

export function Card({
  children,
  className = '',
  hover = false,
  padding = true,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  hover?: boolean
  padding?: boolean
}) {
  return (
    <div
      className={`page-card rounded-[var(--radius-card)] ${padding ? 'p-4' : ''} ${
        hover ? 'transition hover:-translate-y-0.5' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
