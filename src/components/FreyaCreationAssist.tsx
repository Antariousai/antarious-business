import { ArrowUp, Loader2, Sparkles } from 'lucide-react'

/**
 * Freya-first brief composer for create/edit popups.
 * Drafting happens from this prompt; field edits go through Ask Freya chat.
 */
export function FreyaCreationAssist({
  prompt,
  onPromptChange,
  leaveToFreya: _leaveToFreya,
  onLeaveToFreyaChange: _onLeaveToFreyaChange,
  onApplyPrompt,
  applying = false,
  placeholder = 'Describe what you want — tone, who it’s for, offer…',
  disabled = false,
  applyLabel = 'Send to Freya',
}: {
  prompt: string
  onPromptChange: (value: string) => void
  /** @deprecated Freya-first is always on */
  leaveToFreya?: boolean
  /** @deprecated */
  onLeaveToFreyaChange?: (value: boolean) => void
  onApplyPrompt?: () => void
  applying?: boolean
  placeholder?: string
  disabled?: boolean
  applyLabel?: string
}) {
  const canApply = Boolean(onApplyPrompt) && prompt.trim().length > 0 && !disabled

  return (
    <div className="rounded-2xl border-2 border-sky/45 bg-gradient-to-br from-sky-soft/90 via-white to-sky-soft/60 p-4 shadow-sm shadow-sky/10 ring-1 ring-sky/20">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky/15 text-sky">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-bold text-ink">Tell Freya what you want</p>
          <p className="text-[11px] text-muted">
            She drafts for you to review. To change title or copy later, use Ask Freya.
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canApply && onApplyPrompt) {
              e.preventDefault()
              onApplyPrompt()
            }
          }}
          rows={3}
          disabled={disabled || applying}
          placeholder={placeholder}
          className="min-h-[5.5rem] flex-1 resize-none rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-3 text-[14px] leading-relaxed outline-none focus:border-sky focus:ring-2 focus:ring-sky/20 disabled:opacity-60"
        />
        {onApplyPrompt && (
          <button
            type="button"
            onClick={onApplyPrompt}
            disabled={!canApply || applying}
            title={applyLabel}
            aria-label={applyLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky text-white shadow-md shadow-sky/25 transition hover:bg-sky-bright disabled:bg-sky-muted disabled:shadow-none"
          >
            {applying ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            )}
          </button>
        )}
      </div>

      {onApplyPrompt && (
        <p className="mt-2 text-[11px] text-muted">
          Press <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> or
          tap the arrow — Freya drafts from your brief.
        </p>
      )}
    </div>
  )
}
