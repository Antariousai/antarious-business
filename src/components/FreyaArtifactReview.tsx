import { Loader2, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

export type FreyaReviewField = {
  key: string
  label: string
  value: string
  children?: ReactNode
}

/**
 * Read-only Freya draft card. Edits go through Ask Freya (chat), not inline inputs.
 */
export function FreyaArtifactReview({
  title = "Freya's draft",
  subtitle = 'Review below — tap Ask Freya to change anything in chat',
  fields,
  onAskFreya,
  onAskFreyaField,
  onRegenerate,
  regenerating = false,
}: {
  title?: string
  subtitle?: string
  fields: FreyaReviewField[]
  onAskFreya: () => void
  onAskFreyaField?: (key: string, label: string) => void
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
            <p className="text-[15px] font-bold text-ink">{title}</p>
            <p className="text-[12px] text-muted">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
              Redraft
            </button>
          )}
          <button
            type="button"
            onClick={onAskFreya}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky px-3 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-sky/30 hover:bg-sky-bright"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Ask Freya
          </button>
        </div>
      </div>

      {fields.map((field) => {
        const display = field.value.trim()
        return (
          <div
            key={field.key}
            className="flex items-start justify-between gap-3 rounded-xl border border-white/80 bg-white/90 px-3.5 py-3 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold tracking-wide text-sky uppercase">{field.label}</p>
              {field.children ?? (
                <p
                  className={`mt-1 text-[13px] leading-relaxed ${
                    display ? 'text-ink' : 'text-muted italic'
                  }`}
                >
                  {display || 'Not set'}
                </p>
              )}
            </div>
            {onAskFreyaField && (
              <button
                type="button"
                onClick={() => onAskFreyaField(field.key, field.label)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky/25 bg-sky-soft/50 px-2.5 py-1.5 text-[12px] font-semibold text-sky hover:bg-sky-soft"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Ask Freya
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
