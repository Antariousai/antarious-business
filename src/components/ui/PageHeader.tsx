import type { ReactNode } from 'react'
import { PageHero } from '../PageHero'

const ACCENTS = {
  sky: 'sky',
  coral: 'coral',
  mint: 'mint',
  amber: 'amber',
  teal: 'teal',
  peach: 'peach',
} as const

export function PageHeader({
  title,
  subtitle,
  action,
  tabs,
  accent,
  hero = false,
  badge,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  tabs?: ReactNode
  accent?: keyof typeof ACCENTS
  /** Use the colorful PageHero surface */
  hero?: boolean
  badge?: ReactNode
}) {
  if (hero) {
    return (
      <div className="mb-4">
        <PageHero
          accent={accent ? ACCENTS[accent] : 'sky'}
          title={title}
          subtitle={subtitle}
          action={action}
        />
        {tabs}
      </div>
    )
  }

  return (
    <header className="relative shrink-0 overflow-hidden border-b border-sky/15 bg-gradient-to-r from-sky-soft/70 via-white to-mint/20 px-4 pt-4 pb-3 sm:px-6">
      <div className="pointer-events-none absolute -top-10 right-16 h-28 w-28 rounded-full bg-sunshine/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-mint/20 blur-2xl" />
      <div className="relative mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[22px] font-bold tracking-tight text-ink">{title}</h2>
            {badge}
          </div>
          {subtitle && <div className="mt-1 text-[13px] text-muted">{subtitle}</div>}
        </div>
        {action}
      </div>
      {tabs}
    </header>
  )
}
