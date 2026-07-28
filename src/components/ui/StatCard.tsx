import type { LucideIcon } from 'lucide-react'

type Tone = 'sky' | 'navy' | 'green' | 'amber' | 'coral' | 'mint' | 'peach'

const TONES: Record<Tone, { gradient: string; shadow: string }> = {
  sky: { gradient: 'from-sky-bright to-sky', shadow: 'shadow-sky/30' },
  navy: { gradient: 'from-navy-mid to-navy-deep', shadow: 'shadow-navy/30' },
  green: { gradient: 'from-emerald-500 to-mint', shadow: 'shadow-emerald-300/35' },
  amber: { gradient: 'from-amber-500 to-sunshine', shadow: 'shadow-amber-300/40' },
  coral: { gradient: 'from-coral to-rose-500', shadow: 'shadow-coral/30' },
  mint: { gradient: 'from-mint to-teal-500', shadow: 'shadow-mint/30' },
  peach: { gradient: 'from-orange-500 to-peach', shadow: 'shadow-orange-300/35' },
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'sky',
  plain = false,
}: {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
  tone?: Tone
  /** Flat card (Templates-style) instead of gradient KPI */
  plain?: boolean
}) {
  if (plain) {
    return (
      <div className="overflow-hidden rounded-xl border border-sky/15 bg-gradient-to-br from-white via-sky-soft/30 to-white px-4 py-3 shadow-[var(--shadow-sm)]">
        <div className="text-[11px] font-semibold text-sky-bright uppercase">{label}</div>
        <div className="text-[18px] font-bold text-ink">{value}</div>
        {sub && <div className="text-[12px] text-muted">{sub}</div>}
      </div>
    )
  }

  const t = TONES[tone]
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.gradient} p-4 text-white shadow-md ${t.shadow}`}
    >
      {Icon && <Icon className="absolute -right-1 -bottom-1 h-14 w-14 opacity-20" />}
      {Icon && (
        <div className="relative mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="relative text-[11px] font-semibold tracking-wide text-white/80 uppercase">
        {label}
      </div>
      <div className="relative text-[22px] font-bold">{value}</div>
      {sub && <div className="relative text-[12px] text-white/75">{sub}</div>}
    </div>
  )
}
