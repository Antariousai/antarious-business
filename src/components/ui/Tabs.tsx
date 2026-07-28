import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string; icon?: LucideIcon; badge?: ReactNode }[]
  className?: string
}) {
  return (
    <nav className={`relative flex flex-wrap gap-1 ${className}`}>
      {options.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
            value === t.id
              ? 'bg-gradient-to-r from-sky-bright to-sky text-white shadow-sm shadow-sky/30'
              : 'text-neutral-500 hover:bg-white/80 hover:text-ink'
          }`}
        >
          {t.icon && <t.icon className="h-3.5 w-3.5" />}
          {t.label}
          {t.badge}
        </button>
      ))}
    </nav>
  )
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
  className?: string
}) {
  return (
    <div
      className={`inline-flex flex-wrap rounded-full border border-sky/20 bg-white/90 p-0.5 shadow-sm ${className}`}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full px-2.5 py-1.5 text-[12px] font-bold transition ${
            value === o.id
              ? 'bg-gradient-to-r from-sky-bright to-sky text-white shadow-sm'
              : 'text-neutral-500 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
