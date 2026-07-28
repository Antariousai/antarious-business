import { Loader2, Pencil, RefreshCw, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { PlatformIcon } from './PlatformIcon'

export type FreyaCampaignSection =
  | 'title'
  | 'goal'
  | 'audience'
  | 'platforms'
  | 'objective'
  | 'budget'
  | 'tone'
  | 'all'

function ReviewRow({
  label,
  value,
  empty = 'Not set',
  onEdit,
  children,
}: {
  label: string
  value?: string
  empty?: string
  onEdit: () => void
  children?: ReactNode
}) {
  const display = (value ?? '').trim() || empty
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/80 bg-white/90 px-3.5 py-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-wide text-sky uppercase">{label}</p>
        {children ?? (
          <p className={`mt-1 text-[13px] leading-relaxed ${(value ?? '').trim() ? 'text-ink' : 'text-muted italic'}`}>
            {display}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky/25 bg-sky-soft/50 px-2.5 py-1.5 text-[12px] font-semibold text-sky hover:bg-sky-soft"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
    </div>
  )
}

export function FreyaCampaignReview({
  title,
  goal,
  audience,
  platforms,
  objective,
  budget,
  tone,
  onEdit,
  onRegenerate,
  regenerating = false,
}: {
  title: string
  goal: string
  audience: string
  platforms: string[]
  objective: string
  budget: string
  tone: string
  onEdit: (section: FreyaCampaignSection) => void
  onRegenerate?: () => void
  regenerating?: boolean
}) {
  return (
    <div className="space-y-3 rounded-2xl border-2 border-sky/30 bg-gradient-to-br from-sky-soft/70 via-white to-sky-soft/40 p-4 shadow-sm shadow-sky/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky/15 text-sky">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">Freya&apos;s campaign draft</p>
            <p className="text-[12px] text-muted">Review each field — tap Edit to change anything</p>
          </div>
        </div>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-white px-3 py-1.5 text-[12px] font-semibold text-sky hover:bg-sky-soft disabled:opacity-60"
          >
            {regenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Regenerate
          </button>
        )}
      </div>

      <ReviewRow label="Name" value={title} onEdit={() => onEdit('title')} />
      <ReviewRow label="Goal" value={goal} onEdit={() => onEdit('goal')} />
      <ReviewRow label="Audience" value={audience} onEdit={() => onEdit('audience')} />
      <ReviewRow
        label="Platforms"
        empty="No platforms selected"
        onEdit={() => onEdit('platforms')}
      >
        {platforms.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {platforms.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-soft/60 px-2.5 py-1 text-[12px] font-semibold text-ink ring-1 ring-sky/20"
              >
                <PlatformIcon platform={p} size={13} />
                {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[13px] leading-relaxed text-muted italic">No platforms selected</p>
        )}
      </ReviewRow>
      <ReviewRow label="Objective" value={objective} onEdit={() => onEdit('objective')} />
      <ReviewRow label="Budget" value={budget ? `$${budget}` : ''} onEdit={() => onEdit('budget')} />
      <ReviewRow label="Tone" value={tone} onEdit={() => onEdit('tone')} />

      <button
        type="button"
        onClick={() => onEdit('all')}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky/40 bg-white/80 text-[13px] font-semibold text-sky hover:bg-sky-soft/40"
      >
        <Pencil className="h-4 w-4" />
        Edit all details
      </button>
    </div>
  )
}
