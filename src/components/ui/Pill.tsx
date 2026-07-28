import type { ReactNode } from 'react'

export type PillTone =
  | 'sky'
  | 'mint'
  | 'coral'
  | 'sunshine'
  | 'peach'
  | 'neutral'
  | 'navy'
  | 'custom'

const TONES: Record<Exclude<PillTone, 'custom'>, string> = {
  sky: 'bg-sky-soft text-sky-bright',
  mint: 'bg-emerald-100 text-emerald-700',
  coral: 'bg-rose-100 text-rose-700',
  sunshine: 'bg-amber-100 text-amber-800',
  peach: 'bg-orange-100 text-orange-700',
  neutral: 'bg-neutral-100 text-neutral-600',
  navy: 'bg-navy-mid text-white',
}

export function Pill({
  children,
  tone = 'neutral',
  color,
  className = '',
}: {
  children: ReactNode
  tone?: PillTone
  /** Solid background hex — used for domain status colors */
  color?: string
  className?: string
}) {
  if (color || tone === 'custom') {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${className}`}
        style={color ? { background: color } : undefined}
      >
        {children}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function statusTone(
  kind: 'expense' | 'txn' | 'segment',
  value: string,
): PillTone {
  if (kind === 'expense') {
    if (value === 'needs-review') return 'sunshine'
    if (value === 'approved') return 'mint'
    if (value === 'reimbursed') return 'sky'
    return 'neutral'
  }
  if (kind === 'txn') {
    if (value === 'unmatched') return 'sunshine'
    if (value === 'matched') return 'sky'
    if (value === 'reconciled') return 'mint'
    return 'neutral'
  }
  return value === 'b2b' ? 'sky' : 'coral'
}
