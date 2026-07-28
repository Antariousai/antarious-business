import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  Eye,
  MousePointer2,
  Pause,
  Pencil,
  Play,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { EngagementChart } from '../components/EngagementChart'
import { CreateCampaignModal } from '../components/CreateCampaignModal'
import { useCampaigns } from '../context/CampaignsContext'
import { BOUTIQUE } from '../data/mockData'

const STATUS_TONE: Record<string, string> = {
  done: 'bg-emerald-500 text-white',
  running: 'bg-sky-bright text-white',
  draft: 'bg-amber-400 text-navy-deep',
  paused: 'bg-orange-500 text-white',
}

export function CampaignDetailPage() {
  const { id } = useParams()
  const { getCampaign, pause, resume, launch } = useCampaigns()
  const [editing, setEditing] = useState(false)
  const campaign = id ? getCampaign(id) : undefined

  if (!campaign) return <Navigate to="/app/campaigns" replace />

  const progress = campaign.reachProgress ?? 0
  const engagement = campaign.engagement || []
  const setup = campaign.setup
  const posts = campaign.posts || []
  const vsPrior = campaign.vsPrior7d ?? 0
  const cover = posts[0]?.image || BOUTIQUE.eidCollection
  const maxEngage = Math.max(...engagement.map((e) => e.value), 1)

  return (
    <div className="space-y-5 px-8 py-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/campaigns"
          className="text-[13px] font-semibold text-sky-bright hover:underline"
        >
          ← Back to campaigns
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky-soft px-4 py-2 text-[13px] font-semibold text-sky hover:bg-sky/15"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit campaign
          </button>
          {campaign.status === 'running' && (
            <button
              type="button"
              onClick={() => pause(campaign.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}
          {campaign.status === 'paused' && (
            <button
              type="button"
              onClick={() => resume(campaign.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-sky px-4 py-2 text-[13px] font-bold text-white shadow-sm shadow-sky/30"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          )}
          {campaign.status === 'draft' && (
            <button
              type="button"
              onClick={() => launch(campaign.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-[13px] font-bold text-navy-deep shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              Launch campaign
            </button>
          )}
        </div>
      </div>

      {/* Visual hero */}
      <section className="relative overflow-hidden rounded-2xl shadow-lg shadow-sky/15">
        <div className="absolute inset-0">
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/95 via-navy-mid/85 to-navy-mid/55" />
          <div className="absolute -top-10 right-10 h-40 w-40 rounded-full bg-sunshine/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-sky/25 blur-2xl" />
        </div>
        <div className="relative px-6 py-8 text-white md:px-8 md:py-10">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${STATUS_TONE[campaign.status] || 'bg-white/20'}`}
            >
              {campaign.status}
            </span>
            {campaign.budget && (
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
                Budget {campaign.budget}
              </span>
            )}
          </div>
          <h2 className="max-w-2xl text-[28px] font-extrabold tracking-tight drop-shadow md:text-[32px]">
            {campaign.title}
          </h2>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/85">
            Goal: {campaign.goal || campaign.description}
          </p>
          {campaign.audience && (
            <p className="mt-1 max-w-xl text-[13px] text-sky-muted">Audience: {campaign.audience}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {(campaign.platforms || []).map((p) => (
              <span
                key={p}
                className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm ring-1 ring-white/20"
              >
                {p}
              </span>
            ))}
          </div>

          <div className="mt-6 max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-[12px] font-bold text-white/80">
              <span>Reach progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sunshine via-sky to-rose-400 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Metric meters */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: 'People reached',
            value: campaign.reach,
            icon: Eye,
            tone: 'from-sky-bright to-cyan-400',
            delta: '+18%',
          },
          {
            label: 'Clicked through',
            value: campaign.clicks,
            icon: MousePointer2,
            tone: 'from-sky-bright to-coral',
            delta: '+9%',
          },
          {
            label: 'New leads',
            value: campaign.leads,
            icon: Users,
            tone: 'from-emerald-500 to-mint',
            delta: vsPrior >= 0 ? `+${vsPrior}%` : `${vsPrior}%`,
          },
        ].map((k) => {
          const Icon = k.icon
          return (
            <div
              key={k.label}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.tone} p-5 text-white shadow-md`}
            >
              <Icon className="absolute -right-2 -bottom-2 h-20 w-20 opacity-15" strokeWidth={1.25} />
              <div className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div className="relative z-[1] mt-3 text-[28px] font-extrabold leading-none">
                {k.value >= 1000
                  ? `${(k.value / 1000).toFixed(1).replace(/\.0$/, '')}k`
                  : k.value.toLocaleString()}
              </div>
              <div className="relative z-[1] mt-1 flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-white/90">{k.label}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                  {k.delta}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Freya report */}
      <section className="overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-sm">
        <div className="border-b border-sky/10 bg-gradient-to-r from-sky-soft/80 via-sky-soft/50 to-amber-50/60 px-5 py-4 md:px-6">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-bright to-sky-bright text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            Freya&apos;s plain-English report
          </h3>
        </div>
        <div className="p-5 md:p-6">
          <p className="text-[14px] leading-relaxed text-slate-600">
            {campaign.report || campaign.summary}
          </p>
        </div>
      </section>

      {/* Engagement insights — visual */}
      <section className="overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sky/10 px-5 py-4 md:px-6">
          <div>
            <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
                <TrendingUp className="h-4 w-4" />
              </span>
              Engagement growth
            </h3>
            <p className="mt-1 text-[13px] text-muted">
              How people are interacting with this campaign over the last 30 days.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold ${
              vsPrior >= 0
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-orange-50 text-orange-600'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            {vsPrior > 0 ? '+' : ''}
            {vsPrior}% vs prior week
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3 md:p-5">
          <div className="rounded-2xl bg-gradient-to-br from-sky-bright to-sky p-4 text-white shadow-md shadow-sky/25">
            <div className="text-[11px] font-bold tracking-wide text-white/80 uppercase">
              30-day total
            </div>
            <div className="mt-1 text-[22px] font-extrabold leading-tight">
              {(campaign.interactions30d ?? 0).toLocaleString()}
            </div>
            <div className="text-[12px] font-semibold text-white/85">interactions</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 p-4 text-navy-deep shadow-md shadow-amber-300/30">
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase opacity-70">
              <CalendarDays className="h-3.5 w-3.5" />
              Best day
            </div>
            <div className="mt-1 text-[18px] font-extrabold leading-snug">
              {campaign.bestDay || '—'}
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-mint p-4 text-white shadow-md shadow-emerald-300/30">
            <div className="text-[11px] font-bold tracking-wide text-white/80 uppercase">
              Momentum
            </div>
            <div className="mt-1 text-[22px] font-extrabold">
              {vsPrior > 0 ? '+' : ''}
              {vsPrior}%
            </div>
            <div className="text-[12px] font-semibold text-white/85">last 7 days vs prior</div>
          </div>
        </div>

        <div className="px-4 pb-2 md:px-5">
          <EngagementChart data={engagement} />
        </div>

        {/* Mini day bars under chart for extra visual punch */}
        {engagement.length > 0 && (
          <div className="mx-4 mb-4 flex h-16 items-end gap-1 rounded-xl bg-slate-50/80 px-3 py-2 md:mx-5 md:gap-1.5">
            {engagement.map((e) => (
              <div key={e.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-sky-bright to-sky"
                  style={{ height: `${Math.max(12, (e.value / maxEngage) * 100)}%` }}
                  title={`${e.label}: ${e.value}`}
                />
              </div>
            ))}
          </div>
        )}

        {campaign.engagementInsight && (
          <div className="mx-4 mb-5 flex items-start gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-sky-soft/50 to-amber-50 px-4 py-3.5 ring-1 ring-emerald-100 md:mx-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12px] font-bold tracking-wide text-emerald-700 uppercase">
                Freya&apos;s read
              </p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink">
                {campaign.engagementInsight}
              </p>
            </div>
          </div>
        )}
      </section>

      {setup && (
        <section className="overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-sm">
          <div className="border-b border-sky/10 bg-gradient-to-r from-amber-50/80 to-rose-50/50 px-5 py-4 md:px-6">
            <h3 className="text-[16px] font-bold text-ink">How Freya set it up</h3>
            <p className="text-[12px] text-muted">The recipe behind this campaign</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
            {(
              [
                ['Objective', setup.objective, 'from-rose-500 to-orange-400'],
                ['Platform', setup.platform, 'from-sky-bright to-sky'],
                ['Format', setup.format, 'from-sky-bright to-coral'],
                ['Audience', setup.audience, 'from-emerald-500 to-mint'],
                ['Schedule', setup.schedule, 'from-amber-400 to-sunshine'],
                ['Budget', setup.budget, 'from-orange-500 to-peach'],
                ['Tone', setup.tone, 'from-cyan-500 to-sky'],
              ] as const
            ).map(([label, value, tone]) => (
              <div
                key={label}
                className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50"
              >
                <div className={`h-1.5 bg-gradient-to-r ${tone}`} />
                <div className="p-3.5">
                  <div className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                    {label}
                  </div>
                  <div className="mt-1 text-[13.5px] font-semibold text-ink">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-sm">
          <div className="border-b border-sky/10 px-5 py-4 md:px-6">
            <h3 className="text-[16px] font-bold text-ink">Posts in this campaign</h3>
            <p className="text-[12px] text-muted">Creatives Freya is running for you</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
            {posts.map((post, i) => (
              <div
                key={post.id}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl shadow-md"
              >
                <img
                  src={post.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/20 to-transparent" />
                <span className="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[12px] font-extrabold text-ink shadow-sm">
                  {i + 1}
                </span>
                <p className="absolute inset-x-0 bottom-0 p-3.5 text-[13px] font-semibold leading-snug text-white">
                  {post.caption}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {editing && (
        <CreateCampaignModal
          campaign={campaign}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
