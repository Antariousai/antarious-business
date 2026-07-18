import { Loader2, RefreshCw } from 'lucide-react'

export function FreyaReviewBanner({
  onRegenerate,
  regenerating = false,
}: {
  onRegenerate?: () => void
  regenerating?: boolean
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-sky/25 bg-gradient-to-r from-sky-soft/70 to-violet-50/50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-ink">Review & edit</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
          Freya drafted this from your prompt. Change anything below before you save or publish.
        </p>
      </div>
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky/30 bg-white px-3 py-1.5 text-[12px] font-semibold text-sky hover:bg-sky-soft disabled:opacity-60"
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
  )
}
