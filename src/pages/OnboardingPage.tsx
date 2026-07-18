import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, Check, Sparkles } from 'lucide-react'
import { FreyaCharacter } from '../components/FreyaCharacter'
import { Logo } from '../components/Logo'
import { useApp } from '../context/AppContext'
import { FREYA_PERSONA } from '../data/freyaPersona'
import {
  GOAL_OPTIONS,
  PLATFORM_OPTIONS,
  type GoalId,
  type Platform,
} from '../data/mockData'
import {
  AUDIENCE_SERVE_OPTIONS,
  BUSINESS_TYPE_CHIPS,
  TEAM_SIZE_OPTIONS,
  audienceWord,
  formatPlanPrice,
  recommendPlanTier,
  type BusinessTypeChip,
  type PlanTier,
  type TeamSize,
} from '../data/planTiers'
import { clearLoginHandoff, loadLoginHandoff } from '../lib/loginHandoff'

type Step =
  | 'welcome'
  | 'business'
  | 'industry'
  | 'customers'
  | 'goals'
  | 'team'
  | 'platforms'
  | 'done'

interface Message {
  id: string
  role: 'freya' | 'user'
  text: string
}

const GOAL_EMOJI: Record<GoalId, string> = {
  customers: '🧁',
  engagement: '💬',
  leads: '✨',
  replies: '💌',
  money: '💸',
}

const PLATFORM_EMOJI: Record<Platform, string> = {
  Instagram: '📸',
  Facebook: '👍',
  LinkedIn: '💼',
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function seedFromHandoff() {
  const handoff = loadLoginHandoff()
  if (!handoff?.length) return { messages: [] as Message[], fromLogin: false }
  const tail = handoff.slice(-2)
  return {
    fromLogin: true,
    messages: tail.map((m) => ({
      id: m.id,
      role: m.role === 'you' ? 'user' : 'freya',
      text: m.text,
    })) as Message[],
  }
}

export function OnboardingPage() {
  const { profile, onboarded, completeOnboarding } = useApp()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const owner = profile?.ownerName || 'Friend'
  const { messages: initialMessages, fromLogin } = useMemo(() => seedFromHandoff(), [])

  const started = useRef(false)

  useEffect(() => {
    if (onboarded) navigate('/app', { replace: true })
  }, [onboarded, navigate])

  const [step, setStep] = useState<Step>('welcome')
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [customers, setCustomers] = useState('')
  const [goals, setGoals] = useState<GoalId[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [businessType, setBusinessType] = useState<BusinessTypeChip | null>(null)
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null)
  const [audienceServe, setAudienceServe] = useState<'customers' | 'clients' | 'both' | null>(null)
  const [suggestedTier, setSuggestedTier] = useState<PlanTier>('starter')
  const [busy, setBusy] = useState(false)

  const freyaMood = typing ? 'thinking' : busy ? 'excited' : 'happy'

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, step, goals, platforms])

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (fromLogin) {
      clearLoginHandoff()
      void continueFromLogin()
    } else {
      void freyaSay(
        `Hey ${owner}! So glad you're here ✨\n\nI'm Freya — your teammate who drafts posts, replies to messages, and keeps an eye on the money. You just tell me what you need.\n\nReady? Let's get to know your business — it'll take about a minute.`,
        'business',
        `What's your business called? Just the name is perfect.`,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (step === 'business' || step === 'industry' || step === 'customers') {
      inputRef.current?.focus()
    }
  }, [step, typing])

  async function continueFromLogin() {
    setBusy(true)
    setTyping(true)
    await wait(850)
    setTyping(false)
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: 'freya',
        text: `Alright, ${owner} — what's your business called? Just the name is perfect.`,
      },
    ])
    setStep('business')
    setBusy(false)
  }

  async function freyaSay(first: string, nextStep: Step, second?: string) {
    setBusy(true)
    setTyping(true)
    await wait(700 + Math.min(first.length * 8, 900))
    setTyping(false)
    setMessages((prev) => [...prev, { id: uid(), role: 'freya', text: first }])
    if (second) {
      setTyping(true)
      await wait(550)
      setTyping(false)
      setMessages((prev) => [...prev, { id: uid(), role: 'freya', text: second }])
    }
    setStep(nextStep)
    setBusy(false)
  }

  function pushUser(text: string) {
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text }])
  }

  async function handleTextSubmit(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed || busy || typing) return

    if (step === 'business') {
      setBusinessName(trimmed)
      setInput('')
      pushUser(trimmed)
      await freyaSay(
        `${trimmed} — love that already 💛`,
        'industry',
        `What kind of business is it? Tap a type below, or type your own.`,
      )
      return
    }

    if (step === 'industry') {
      setIndustry(trimmed)
      setInput('')
      pushUser(trimmed)
      await freyaSay(
        `Got it — ${trimmed}. I'll speak your language.`,
        'customers',
        `Who do you serve most — customers, clients, or both? Tap one, or type a quick picture of them.`,
      )
      return
    }

    if (step === 'customers') {
      setCustomers(trimmed)
      if (!audienceServe) {
        const inferred = audienceWord(trimmed, industry)
        setAudienceServe(inferred === 'clients' ? 'clients' : 'customers')
      }
      setInput('')
      pushUser(trimmed)
      await freyaSay(
        `Those are great people to show up for.`,
        'goals',
        `What do you want most help with right now? Tap as many as you like — then hit "That's me".`,
      )
    }
  }

  async function continueAudience(id: 'customers' | 'clients' | 'both') {
    if (busy || typing) return
    setAudienceServe(id)
    const opt = AUDIENCE_SERVE_OPTIONS.find((o) => o.id === id)
    pushUser(opt?.label || id)
    const word = audienceWord(undefined, industry, id)
    await freyaSay(
      `Perfect — I'll talk about your ${word}.`,
      'goals',
      `What do you want most help with right now? Tap as many as you like — then hit "That's me".`,
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void handleTextSubmit(input)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleTextSubmit(input)
    }
  }

  function toggleGoal(id: GoalId) {
    if (busy) return
    setGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))
  }

  function togglePlatform(p: Platform) {
    if (busy) return
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  async function continueGoals() {
    if (!goals.length || busy) return
    const label = goals.map((g) => GOAL_OPTIONS.find((o) => o.id === g)?.label).join(', ')
    pushUser(label)
    await freyaSay(
      `Perfect — I'll keep ${goals.length === 1 ? 'that' : 'those'} front and center.`,
      'team',
      `How big is the team? Just you, a few people, or a bigger team? This helps me pick a simple plan for you.`,
    )
  }

  async function continueTeam(size: TeamSize) {
    if (busy) return
    setTeamSize(size)
    const tier = recommendPlanTier(size)
    setSuggestedTier(tier)
    const opt = TEAM_SIZE_OPTIONS.find((o) => o.id === size)
    pushUser(opt?.label || size)
    await freyaSay(
      `Got it — I'd suggest ${tier === 'starter' ? 'Starter' : tier === 'growth' ? 'Growth' : 'Scale'} (${formatPlanPrice(tier)}). Teammates are +$7/seat when you need them. You can change the plan anytime in Settings.`,
      'platforms',
      `Last one: where do you hang out online? Pick the places you use — we'll connect them properly later.`,
    )
  }

  async function continuePlatforms() {
    if (!platforms.length || busy) return
    pushUser(platforms.join(', '))
    setBusy(true)
    setTyping(true)
    await wait(800)
    setTyping(false)
    const tierLabel =
      suggestedTier === 'starter' ? 'Starter' : suggestedTier === 'growth' ? 'Growth' : 'Scale'
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: 'freya',
        text: `You're all set, ${owner} 🎉\n\nI'm hopping into ${businessName || 'your business'} on ${tierLabel} — Today is ready whenever you are.`,
      },
    ])
    setStep('done')
    await wait(1400)
    completeOnboarding({
      businessName: businessName || "Joy's Bakery",
      industry: industry || 'Bakery',
      customers: customers || 'Local families',
      goals,
      platforms,
      planTier: suggestedTier,
      teamSize: teamSize || 'solo',
      businessType: businessType || undefined,
      audienceServe: audienceServe || undefined,
    })
    navigate('/app')
  }

  const showComposer = step === 'business' || step === 'industry' || step === 'customers'
  const placeholders: Partial<Record<Step, string>> = {
    business: "e.g. Joy's Bakery",
    industry: 'e.g. Bakery',
    customers: 'e.g. Local families who love weekend treats',
  }

  return (
    <div className="onboard-stage relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[#faf7f2]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[#fde68a]/35 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-20 h-64 w-64 rounded-full bg-[#fda4af]/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-24 h-72 w-72 rounded-full bg-[#7dd3fc]/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-[#6ee7b7]/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Logo size={34} />
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-slate-500 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-online shadow-[0_0_0_3px_rgba(74,222,128,0.25)]" />
          Chat with Freya
        </div>
      </header>

      <div
        ref={scrollRef}
        className="relative z-10 mx-auto flex w-full max-w-[720px] flex-1 flex-col overflow-y-auto px-4 pb-4 sm:px-6"
      >
        <div className="mx-auto mb-6 mt-2 flex max-w-md flex-col items-center text-center">
          <div className="relative mb-3">
            <FreyaCharacter size={112} variant="hero" mood={freyaMood} />
          </div>
          <p className="text-[13px] font-semibold tracking-wide text-slate-400 uppercase">
            {FREYA_PERSONA.name}
          </p>
          <p className="mt-1 text-[15px] font-medium text-slate-600">{FREYA_PERSONA.tagline}</p>
        </div>

        <div className="flex flex-col gap-4 pb-4">
          {messages.map((m) =>
            m.role === 'freya' ? (
              <div key={m.id} className="flex items-start gap-3 onboard-fade-up">
                <FreyaCharacter size={32} variant="avatar" mood="happy" />
                <div className="min-w-0 max-w-[min(100%,34rem)]">
                  <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-400">
                    {FREYA_PERSONA.name}
                  </div>
                  <div className="rounded-[1.25rem] rounded-tl-md bg-white px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-[#1a2332] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.04]">
                    {m.text}
                  </div>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end onboard-fade-up">
                <div className="max-w-[min(100%,32rem)] rounded-[1.25rem] rounded-tr-md bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-white shadow-[0_10px_28px_-12px_rgba(14,165,233,0.55)]">
                  {m.text}
                </div>
              </div>
            ),
          )}

          {typing && (
            <div className="flex items-start gap-3">
              <FreyaCharacter size={32} variant="avatar" mood="thinking" />
              <div className="rounded-[1.25rem] rounded-tl-md bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/[0.04]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-sky-bright [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-sky [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-sky-muted [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {step === 'industry' && !typing && (
            <div className="ml-11 onboard-fade-up">
              <div className="mb-3 flex flex-wrap gap-2">
                {BUSINESS_TYPE_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setBusinessType(chip.id)
                      setIndustry(chip.label)
                      void handleTextSubmit(chip.label)
                    }}
                    className="rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/80 hover:ring-sky/40"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'customers' && !typing && (
            <div className="ml-11 onboard-fade-up">
              <div className="mb-3 flex flex-wrap gap-2">
                {AUDIENCE_SERVE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCustomers(opt.hint)
                      void continueAudience(opt.id)
                    }}
                    className="flex flex-col rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-sm ring-1 ring-slate-200/80 hover:ring-sky/40"
                  >
                    <span className="text-[13px] font-bold text-ink">{opt.label}</span>
                    <span className="text-[11px] text-muted">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'goals' && !typing && (
            <div className="ml-11 onboard-fade-up">
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((g) => {
                  const on = goals.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGoal(g.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                        on
                          ? 'bg-gradient-to-r from-amber-400 to-orange-300 text-navy-deep shadow-md shadow-amber-300/40 ring-2 ring-amber-200'
                          : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80 hover:ring-sky/40'
                      }`}
                    >
                      <span>{GOAL_EMOJI[g.id]}</span>
                      {g.label}
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                disabled={!goals.length}
                onClick={() => void continueGoals()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0b131e] px-5 py-2.5 text-[14px] font-bold text-white shadow-lg transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4 text-sunshine" />
                That&apos;s me
              </button>
            </div>
          )}

          {step === 'team' && !typing && (
            <div className="ml-11 space-y-2 onboard-fade-up">
              {TEAM_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => void continueTeam(opt.id)}
                  className="flex w-full flex-col rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-200/80 transition hover:ring-sky/40"
                >
                  <span className="text-[14px] font-bold text-ink">{opt.label}</span>
                  <span className="text-[12px] text-muted">{opt.hint}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'platforms' && !typing && (
            <div className="ml-11 onboard-fade-up">
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((p) => {
                  const on = platforms.includes(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition ${
                        on
                          ? 'bg-gradient-to-r from-sky-bright to-sky text-white shadow-md shadow-sky/35 ring-2 ring-sky/30'
                          : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80 hover:ring-sky/40'
                      }`}
                    >
                      <span>{PLATFORM_EMOJI[p]}</span>
                      {p}
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                disabled={!platforms.length}
                onClick={() => void continuePlatforms()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 text-[14px] font-bold text-navy-deep shadow-lg shadow-amber-300/40 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Let&apos;s go →
              </button>
            </div>
          )}
        </div>
      </div>

      {showComposer && (
        <div className="relative z-10 mx-auto w-full max-w-[720px] px-4 pb-6 sm:px-6">
          <form
            onSubmit={onSubmit}
            className="rounded-[1.5rem] bg-white p-2 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.25)] ring-1 ring-black/[0.06]"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                disabled={busy || typing}
                placeholder={placeholders[step] || 'Type a reply…'}
                className="max-h-32 min-h-[48px] flex-1 resize-none bg-transparent px-3 py-3 text-[15px] leading-relaxed text-[#0b131e] outline-none placeholder:text-slate-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy || typing}
                aria-label="Send"
                className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-bright to-sky text-white shadow-md shadow-sky/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          </form>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Enter to send · Shift+Enter for a new line · Demo data stays on your device
          </p>
        </div>
      )}

      {!showComposer && step !== 'done' && (
        <p className="relative z-10 pb-6 text-center text-[11px] text-slate-400">
          Demo only — you can change anything later in Settings
        </p>
      )}
    </div>
  )
}
