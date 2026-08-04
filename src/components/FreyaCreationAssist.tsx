import { ArrowUp, Loader2, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

export function FreyaCreationAssist({
  prompt,
  onPromptChange,
  leaveToFreya,
  onLeaveToFreyaChange,
  onApplyPrompt,
  applying = false,
  placeholder = 'Describe what you want — tone, who it’s for, offer…',
  disabled = false,
  applyLabel = 'Send to Freya',
}: {
  prompt: string
  onPromptChange: (value: string) => void
  leaveToFreya: boolean
  onLeaveToFreyaChange: (value: boolean) => void
  /** Freya drafts from the prompt; you review below */
  onApplyPrompt?: () => void
  applying?: boolean
  placeholder?: string
  disabled?: boolean
  applyLabel?: string
}) {
  const { entitlements } = useApp()
  const showAdvanced = entitlements.advancedCreate
  const effectiveLeave = showAdvanced && leaveToFreya
  const canApply = Boolean(onApplyPrompt) && prompt.trim().length > 0 && !disabled

  useEffect(() => {
    if (!showAdvanced && leaveToFreya) onLeaveToFreyaChange(false)
  }, [showAdvanced, leaveToFreya, onLeaveToFreyaChange])

  return (
    <div className="rounded-2xl border-2 border-sky/45 bg-gradient-to-br from-sky-soft/90 via-white to-sky-soft/60 p-4 shadow-sm shadow-sky/10 ring-1 ring-sky/20">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky/15 text-sky">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-bold text-ink">Tell Freya what you want</p>
          <p className="text-[11px] text-muted">
            {effectiveLeave
              ? 'Freya drafts everything — you review & edit below'
              : 'Send your brief, then review & edit below'}
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
          tap the arrow — Freya drafts from your prompt for you to review.
        </p>
      )}

      {showAdvanced ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">Draft everything at once</p>
            <p className="text-[11px] text-muted">
            {effectiveLeave
              ? 'Freya fills the form — you review before saving'
              : 'Turn on so Freya fills more fields from your brief'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={effectiveLeave}
          aria-label="Draft everything at once"
          disabled={disabled || applying}
          onClick={() => onLeaveToFreyaChange(!leaveToFreya)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            effectiveLeave ? 'bg-sky' : 'bg-slate-300'
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              effectiveLeave ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted">
          Tip: Growth and Scale unlock “draft everything at once.” On Starter, Freya still helps from
          your brief — you keep editing the fields below.
        </p>
      )}
    </div>
  )
}
