import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { FreyaAvatar } from './FreyaAvatar'
import { useApp } from '../context/AppContext'

/** Keep in sync with FREYA_TOUR_LENGTH in AppContext. */
const STEPS = [
  {
    path: '/app',
    freya: "Quick spin — promise it's short.",
    title: 'Today is your home base',
    body: "I'll park drafts under Needs your OK. Tap Approve when it sounds like you — or just tell me “approve all”.",
    cta: 'Next →',
  },
  {
    path: '/app/inbox',
    freya: 'Customer chats are next.',
    title: 'Messages = I draft, you send',
    body: 'Open a thread, skim my reply, hit Send it. Takes two seconds when you’re busy.',
    cta: 'Next →',
  },
  {
    path: '/app/content',
    freya: 'Last stop!',
    title: 'Posts are easy',
    body: 'Tell me what to say, upload your photo, then Approve or Publish. That’s the whole loop.',
    cta: 'Let’s go →',
  },
] as const

export function FreyaTour() {
  const { prefs, nextTourStep, endTour, profile } = useApp()
  const navigate = useNavigate()

  const active = prefs.tourActive
  const stepIndex = Math.min(prefs.tourStep, STEPS.length - 1)
  const step = STEPS[stepIndex]
  const isLast = stepIndex >= STEPS.length - 1
  const owner = profile?.ownerName || 'there'
  const biz = profile?.businessName

  // Land on the right screen as soon as the tour (or a step) is active
  useEffect(() => {
    if (!active || !step) return
    navigate(step.path, { replace: true })
  }, [active, stepIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active || !step) return null

  function advance() {
    if (isLast) {
      endTour(true)
      navigate('/app')
      return
    }
    nextTourStep()
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4 sm:bottom-8 sm:justify-end sm:pr-8 sm:pl-0">
      <div className="pointer-events-auto w-full max-w-[360px] overflow-hidden rounded-[1.35rem] bg-white shadow-[0_20px_50px_-16px_rgba(15,23,42,0.35)] ring-1 ring-black/5 animate-[tourIn_0.28s_ease-out]">
        <div className="bg-gradient-to-r from-sky-soft/80 via-amber-50/50 to-rose-50/40 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <FreyaAvatar size={36} online />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0b131e]">
                Freya
                <span className="rounded-full bg-sky/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-sky-bright uppercase">
                  Tour
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-500">
                {step.freya}
                {biz ? ` · ${biz}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => endTour(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/80 hover:text-ink"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pt-3.5 pb-4">
          <div className="mb-2.5 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition ${
                  i <= stepIndex ? 'bg-sky-bright' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <h3 className="text-[16px] font-extrabold tracking-tight text-[#0b131e]">{step.title}</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{step.body}</p>
          <p className="mt-2 text-[11px] text-slate-400">
            Hey {owner} — {stepIndex + 1} of {STEPS.length}. Skip anytime.
          </p>

          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={advance}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-sky px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-sky/35 hover:brightness-110"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {step.cta}
            </button>
            {!isLast && (
              <button
                type="button"
                onClick={() => endTour(false)}
                className="rounded-full px-3 py-2.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-ink"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tourIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
