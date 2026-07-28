import type { HTMLAttributes, ReactNode } from 'react'

export function Page({
  children,
  fill = false,
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  /** Absolute fill for inbox/pipeline/money style layouts */
  fill?: boolean
}) {
  if (fill) {
    return (
      <div className={`absolute inset-0 flex min-h-0 overflow-hidden ${className}`} {...rest}>
        {children}
      </div>
    )
  }
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 ${className}`} {...rest}>
      {children}
    </div>
  )
}
