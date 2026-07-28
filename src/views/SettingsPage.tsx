import { useEffect, useState } from 'react'
import { Check, Link2, Minus, Plus, Sparkles, Unlink, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { PlatformIcon } from '../components/PlatformIcon'
import { Button, Card } from '../components/ui'
import { useApp, type FreyaTone } from '../context/AppContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import {
  GOAL_OPTIONS,
  PLATFORM_OPTIONS,
  type GoalId,
  type Platform,
} from '../data/mockData'
import {
  AI_CREDIT_PACKS,
  INCLUDED_OWNER_SEATS,
  PLAN_TIERS,
  aiCreditAllowance,
  estimateMonthlyTotal,
  SEAT_PRICE_MONTHLY,
  formatBdt,
  formatPlanPrice,
  formatSeatPrice,
  type PlanTier,
} from '../data/planTiers'

const TONES: { id: FreyaTone; label: string; blurb: string; accent: string }[] = [
  {
    id: 'warm',
    label: 'Warm',
    blurb: 'Friendly teammate energy',
    accent: 'from-rose-400 to-coral',
  },
  {
    id: 'professional',
    label: 'Pro',
    blurb: 'Clear and businesslike',
    accent: 'from-sky-bright to-sky-bright',
  },
  {
    id: 'playful',
    label: 'Playful',
    blurb: 'Light, upbeat, emoji-ok',
    accent: 'from-amber-400 to-sunshine',
  },
]

const GOAL_CHIP_ON = [
  'bg-gradient-to-r from-sky-bright to-sky-bright text-white shadow-sm shadow-sky/30',
  'bg-gradient-to-r from-emerald-500 to-mint text-white shadow-sm shadow-emerald-300/30',
  'bg-gradient-to-r from-amber-500 to-sunshine text-navy-deep shadow-sm shadow-amber-300/30',
  'bg-gradient-to-r from-rose-400 to-coral text-white shadow-sm shadow-rose-300/30',
  'bg-gradient-to-r from-orange-500 to-peach text-white shadow-sm shadow-orange-300/30',
]

export function SettingsPage() {
  const {
    profile,
    prefs,
    billing,
    planTier,
    entitlements,
    seatLimit,
    aiCreditsRemaining,
    setPlanTier,
    setPurchasedSeats,
    buyAiCreditPack,
    resetAiCreditsDemo,
    updateProfile,
    updateGoals,
    updatePlatforms,
    updatePrefs,
    connectPlatform,
    disconnectPlatform,
    startTour,
  } = useApp()
  const { resetDemo } = useFreyaActivity()
  const [saved, setSaved] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [profileDraft, setProfileDraft] = useState({
    ownerName: '',
    businessName: '',
    industry: '',
    customers: '',
  })
  const [profileDirty, setProfileDirty] = useState(false)

  const creditCap = aiCreditAllowance(planTier, billing.aiCreditsPurchased)
  const creditUsedPct = creditCap > 0 ? Math.min(100, Math.round((billing.aiCreditsUsed / creditCap) * 100)) : 0
  const monthlyEstimate = estimateMonthlyTotal(planTier, seatLimit)
  const connectedCount = prefs.connectedPlatforms.length
  const channelLimit = entitlements.maxChannels

  useEffect(() => {
    if (!profile) return
    setProfileDraft({
      ownerName: profile.ownerName,
      businessName: profile.businessName,
      industry: profile.industry,
      customers: profile.customers,
    })
    setProfileDirty(false)
  }, [profile])

  if (!profile) return null

  function flashSaved() {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  function toggleGoal(id: GoalId) {
    const next = profile!.goals.includes(id)
      ? profile!.goals.filter((g) => g !== id)
      : [...profile!.goals, id]
    updateGoals(next)
    flashSaved()
  }

  function toggleWantedPlatform(p: Platform) {
    const next = profile!.platforms.includes(p)
      ? profile!.platforms.filter((x) => x !== p)
      : [...profile!.platforms, p]
    updatePlatforms(next)
    flashSaved()
  }

  function saveProfileDraft() {
    updateProfile({
      ownerName: profileDraft.ownerName.trim(),
      businessName: profileDraft.businessName.trim(),
      industry: profileDraft.industry.trim(),
      customers: profileDraft.customers.trim(),
    })
    setProfileDirty(false)
    flashSaved()
  }

  function handleConnect(p: Platform) {
    setConnectError(null)
    if (connectedCount >= channelLimit) {
      setConnectError(
        `Your ${entitlements.label} plan allows ${channelLimit} connected channel${channelLimit === 1 ? '' : 's'}. Upgrade or disconnect one first.`,
      )
      return
    }
    connectPlatform(p)
    flashSaved()
  }

  return (
    <div className="relative mx-auto max-w-3xl space-y-6 overflow-hidden px-6 py-6 pb-24 md:px-8">
      <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-sunshine/15 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-12 h-36 w-36 rounded-full bg-sky/15 blur-3xl" />

      <PageHero
        accent="sky"
        title="Settings"
        subtitle="Your business, your plan, and how Freya should work with you."
      />

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-mint/20 to-sky-soft/40 px-4 py-2.5 text-[13px] font-semibold text-emerald-700 shadow-sm">
          <Check className="h-4 w-4" /> Saved
        </div>
      )}

      <Card className="overflow-hidden p-5">
        <h3 className="text-[15px] font-bold text-ink">Your plan</h3>
        <p className="mt-1 text-[13px] text-muted">
          Base price unlocks features. Teammates are +{formatSeatPrice()} (owner included).
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(Object.keys(PLAN_TIERS) as PlanTier[]).map((id) => {
            const plan = PLAN_TIERS[id]
            const on = planTier === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setPlanTier(id)
                  flashSaved()
                }}
                className={`rounded-2xl border px-3.5 py-3 text-left transition ${
                  on
                    ? 'border-sky bg-sky-soft/50 ring-2 ring-sky/25'
                    : 'border-slate-200 bg-white hover:border-sky/40'
                }`}
              >
                <p className="text-[14px] font-bold text-ink">{plan.label}</p>
                <p className="mt-0.5 text-[15px] font-bold text-sky">{formatPlanPrice(plan)}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted">{plan.promise}</p>
                <p className="mt-2 text-[10px] font-semibold text-sky">
                  {plan.includedAiCredits.toLocaleString()} AI credits/mo · up to {plan.maxChannels}{' '}
                  channels
                </p>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
          <div>
            <p className="text-[12px] font-semibold text-ink">Team seats</p>
            <p className="text-[11px] text-muted">
              Owner included · extras {formatBdt(SEAT_PRICE_MONTHLY)}/mo each
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Fewer seats"
              onClick={() => {
                setPurchasedSeats(seatLimit - 1)
                flashSaved()
              }}
              disabled={seatLimit <= INCLUDED_OWNER_SEATS}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-ink disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[2rem] text-center text-[14px] font-bold text-ink">{seatLimit}</span>
            <button
              type="button"
              aria-label="More seats"
              onClick={() => {
                setPurchasedSeats(seatLimit + 1)
                flashSaved()
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-ink"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-muted">
          Current: {entitlements.label} · est. {formatBdt(monthlyEstimate)}/mo (demo)
        </p>
      </Card>

      <Card className="overflow-hidden p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-sunshine text-navy-deep shadow-sm">
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-ink">Freya AI credits</h3>
            <p className="text-[12px] text-muted">
              {aiCreditsRemaining.toLocaleString()} left of {creditCap.toLocaleString()} this month
            </p>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky via-sky-bright to-sky-bright transition-all"
            style={{ width: `${creditUsedPct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {billing.aiCreditsUsed.toLocaleString()} used
          {billing.aiCreditsPurchased > 0
            ? ` · ${billing.aiCreditsPurchased.toLocaleString()} bought`
            : ''}{' '}
          · {entitlements.includedAiCredits.toLocaleString()} included on {entitlements.label}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {AI_CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => {
                buyAiCreditPack(pack.id)
                flashSaved()
              }}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-sky/40"
            >
              <p className="text-[13px] font-bold text-ink">{pack.label}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-sky">
                +{pack.credits.toLocaleString()} · {formatBdt(pack.priceBdt)}
              </p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            resetAiCreditsDemo()
            flashSaved()
          }}
          className="mt-3 text-[12px] font-semibold text-sky hover:underline"
        >
          Reset month (demo)
        </button>
      </Card>

      <Card className="overflow-hidden p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-bright to-sky-bright text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-ink">Business profile</h3>
              <p className="text-[12px] text-muted">Edit your details, then save.</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={saveProfileDraft}
            disabled={!profileDirty}
            className="disabled:opacity-40"
          >
            Save changes
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['ownerName', 'Your name'],
              ['businessName', 'Business name'],
              ['industry', 'Industry'],
              ['customers', 'Who you serve'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-[12px] font-semibold text-slate-500">
              {label}
              <input
                value={profileDraft[key]}
                onChange={(e) => {
                  setProfileDraft((prev) => ({ ...prev, [key]: e.target.value }))
                  setProfileDirty(true)
                }}
                className="mt-1.5 h-11 w-full rounded-xl border border-sky/15 bg-gradient-to-br from-white to-sky-soft/20 px-3.5 text-[14px] font-medium text-ink outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              />
            </label>
          ))}
        </div>
        {profileDirty && (
          <p className="mt-3 text-[12px] font-semibold text-amber-700">
            You have unsaved profile changes.
          </p>
        )}
      </Card>

      <Card className="overflow-hidden p-5">
        <h3 className="text-[15px] font-bold text-ink">Goals</h3>
        <p className="mt-1 text-[13px] text-muted">What you&apos;re building toward — Freya tunes her suggestions.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((g, i) => {
            const on = profile.goals.includes(g.id)
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGoal(g.id)}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition hover:brightness-105 ${
                  on
                    ? GOAL_CHIP_ON[i % GOAL_CHIP_ON.length]
                    : 'bg-slate-100 text-slate-600 hover:bg-sky-soft/60 hover:text-sky-bright'
                }`}
              >
                {g.label}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="overflow-hidden p-5">
        <h3 className="text-[15px] font-bold text-ink">Channels you care about</h3>
        <p className="mt-1 text-[13px] text-muted">What Freya should prioritize in Posts & Campaigns.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((p, i) => {
            const on = profile.platforms.includes(p)
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggleWantedPlatform(p)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition hover:brightness-105 ${
                  on
                    ? GOAL_CHIP_ON[i % GOAL_CHIP_ON.length]
                    : 'bg-slate-100 text-slate-600 hover:bg-sky-soft/60 hover:text-sky-bright'
                }`}
              >
                <PlatformIcon platform={p} size={15} tone={on ? 'white' : 'brand'} />
                {p}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="overflow-hidden p-5">
        <h3 className="text-[15px] font-bold text-ink">Connect platforms</h3>
        <p className="mt-1 text-[13px] text-muted">
          Connect at least one channel to publish or schedule posts. Until then, new posts stay as
          drafts. Demo connect — no real OAuth yet.
        </p>
        <p className="mt-2 text-[12px] font-semibold text-sky">
          {connectedCount}/{channelLimit} channels connected on {entitlements.label}
        </p>
        {connectError && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
            {connectError}
          </p>
        )}
        {connectedCount === 0 && (
          <p className="mt-2 rounded-xl border border-sky/20 bg-sky-soft/40 px-3 py-2 text-[12px] text-sky-bright">
            No channels linked — you can still write posts, but they&apos;ll save as drafts only.
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {PLATFORM_OPTIONS.map((p, i) => {
            const connected = prefs.connectedPlatforms.includes(p)
            return (
              <li
                key={p}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                  connected
                    ? 'border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 via-white to-mint/20 shadow-sm'
                    : 'border-sky/15 bg-gradient-to-r from-white via-sky-soft/15 to-sky-soft/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                    <PlatformIcon platform={p} size={20} />
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-ink">{p}</div>
                    <div className={`text-[12px] ${connected ? 'font-semibold text-emerald-600' : 'text-muted'}`}>
                      {connected ? 'Connected ✓' : 'Not connected'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (connected) {
                      setConnectError(null)
                      disconnectPlatform(p)
                      flashSaved()
                    } else {
                      handleConnect(p)
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition hover:brightness-105 ${
                    connected
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : GOAL_CHIP_ON[i % GOAL_CHIP_ON.length]
                  }`}
                >
                  {connected ? (
                    <>
                      <Unlink className="h-3.5 w-3.5" /> Disconnect
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" /> Connect
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        <Link
          to="/app/content"
          className="mt-4 inline-flex text-[13px] font-bold text-sky hover:underline"
        >
          Go to Content →
        </Link>
      </Card>

      <Card className="overflow-hidden p-5">
        <h3 className="text-[15px] font-bold text-ink">Freya preferences</h3>
        <p className="mt-3 text-[12px] font-semibold text-slate-500">Tone</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                updatePrefs({ tone: t.id })
                flashSaved()
              }}
              className={`rounded-xl px-3 py-3 text-left transition hover:brightness-105 ${
                prefs.tone === t.id
                  ? `bg-gradient-to-br ${t.accent} text-white shadow-md`
                  : 'border border-sky/10 bg-gradient-to-br from-white to-sky-soft/20 text-ink hover:border-sky/25'
              }`}
            >
              <div className="text-[13px] font-bold">{t.label}</div>
              <div
                className={`mt-0.5 text-[11px] ${prefs.tone === t.id ? 'text-white/80' : 'text-muted'}`}
              >
                {t.blurb}
              </div>
            </button>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-sky/15 bg-gradient-to-r from-sky-soft/40 via-white to-sky-soft/30 px-4 py-3">
          <div>
            <div className="text-[13px] font-bold text-ink">Auto-approve low-risk drafts</div>
            <div className="text-[12px] text-muted">Demo toggle — Freya still logs everything in Activity.</div>
          </div>
          <input
            type="checkbox"
            checked={prefs.autoApprove}
            onChange={(e) => {
              updatePrefs({ autoApprove: e.target.checked })
              flashSaved()
            }}
            className="h-4 w-4 accent-sky"
          />
        </label>
      </Card>

      <Card className="overflow-hidden border border-sky/20 bg-gradient-to-br from-sky-soft/40 via-white to-sky-soft/30 p-5">
        <h3 className="text-[15px] font-bold text-ink">Freya tour</h3>
        <p className="mt-1 text-[13px] text-muted">
          {prefs.tourCompleted
            ? 'You’ve finished Freya’s quick tour. Replay anytime.'
            : 'Three quick stops with Freya: Today → Messages → Posts.'}
        </p>
        <Button type="button" onClick={startTour} className="mt-4">
          <Sparkles className="h-3.5 w-3.5" />
          {prefs.tourCompleted ? 'Replay Freya tour' : 'Start Freya tour'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 ml-2"
          onClick={() => {
            resetDemo()
            flashSaved()
          }}
        >
          Reset Freya Activity demo
        </Button>
      </Card>
    </div>
  )
}
