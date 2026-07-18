import type { ReactNode } from 'react'

const ACCENTS = {
  sky: 'page-hero-sky',
  coral: 'page-hero-coral',
  mint: 'page-hero-mint',
  amber: 'page-hero-amber',
  violet: 'page-hero-violet',
  teal: 'page-hero-teal',
} as const

export function PageHero({
  accent = 'sky',
  title,
  subtitle,
  action,
}: {
  accent?: keyof typeof ACCENTS
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={`page-hero ${ACCENTS[accent]} mb-6 flex flex-wrap items-start justify-between gap-4`}>
      <div className="relative z-10 min-w-0 max-w-2xl">
        <h2 className="text-[26px] font-bold tracking-tight drop-shadow-sm">{title}</h2>
        {subtitle && (
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/85">{subtitle}</p>
        )}
      </div>
      {action && <div className="relative z-10 shrink-0">{action}</div>}
    </div>
  )
}
