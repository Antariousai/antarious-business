import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check,
  Eye,
  Megaphone,
  Pause,
  Pencil,
  Play,
  Plus,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react'
import { CreateCampaignModal } from '../components/CreateCampaignModal'
import { PageHero } from '../components/PageHero'
import { useCampaigns } from '../context/CampaignsContext'
import type { Campaign } from '../data/mockData'
import { BAKERY } from '../data/mockData'

const STATUS: Record<
  Campaign['status'],
  {
    label: string
    badge: string
    wash: string
    bar: string
    icon: typeof Check
  }
> = {
  done: {
    label: 'Done',
    badge: 'bg-emerald-500 text-white shadow-sm shadow-emerald-300/50',
    wash: 'from-emerald-500/90 via-teal-500/70 to-sky/60',
    bar: 'from-emerald-500 to-mint',
    icon: Check,
  },
  running: {
    label: 'Running',
    badge: 'bg-sky-bright text-white shadow-sm shadow-sky/40',
    wash: 'from-sky-bright/90 via-violet-500/65 to-rose-400/55',
    bar: 'from-sky-bright to-violet-400',
    icon: Play,
  },
  draft: {
    label: 'Draft',
    badge: 'bg-amber-400 text-navy-deep shadow-sm shadow-amber-300/50',
    wash: 'from-amber-500/90 via-orange-400/70 to-rose-300/50',
    bar: 'from-amber-400 to-orange-400',
    icon: Megaphone,
  },
  paused: {
    label: 'Paused',
    badge: 'bg-orange-500 text-white shadow-sm shadow-orange-300/40',
    wash: 'from-slate-700/90 via-orange-500/50 to-rose-400/40',
    bar: 'from-orange-400 to-rose-400',
    icon: Pause,
  },
}

const FALLBACK_COVERS = [
  BAKERY.berryTart,
  BAKERY.sourdough,
  BAKERY.croissants,
  BAKERY.cinnamonRoll,
]

export function CampaignsPage() {
  const { campaigns, pause, resume, launch } = useCampaigns()
  const [showCreate, setShowCreate] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const navigate = useNavigate()

  return (
    <div className="px-8 py-6 pb-24">
      <PageHero
        accent="amber"
        title="Your next push"
        subtitle="Tell Freya the basics — she builds and runs the whole thing. You just approve."
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-amber-700 shadow-sm hover:bg-amber-50"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            New campaign
          </button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        {campaigns.map((c, i) => {
          const st = STATUS[c.status]
          const Icon = st.icon
          const cover = c.posts?.[0]?.image || FALLBACK_COVERS[i % FALLBACK_COVERS.length]
          const progress = c.reachProgress ?? (c.status === 'done' ? 100 : c.status === 'draft' ? 8 : 40)
          const maxMetric = Math.max(c.reach / 20, c.clicks, c.leads * 30, 1)

          return (
            <article
              key={c.id}
              className="group overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-lg shadow-sky/10 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/40"
            >
              <div className="relative h-40 overflow-hidden sm:h-44">
                <img
                  src={cover}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${st.wash}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy-deep/20 to-transparent" />

                <span
                  className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${st.badge}`}
                >
                  <Icon className="h-3 w-3" />
                  {st.label}
                </span>

                {(c.platforms || []).length > 0 && (
                  <div className="absolute top-3 right-3 flex gap-1">
                    {(c.platforms || []).slice(0, 2).map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <Link to={`/app/campaigns/${c.id}`} className="block hover:opacity-90">
                    <h3 className="text-[18px] font-extrabold leading-snug drop-shadow">
                      {c.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-[12px] font-medium text-white/85">
                      {c.description}
                    </p>
                  </Link>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <p className="text-[13px] leading-relaxed text-slate-600">{c.summary}</p>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500">Reach progress</span>
                    <span className="text-ink">{progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${st.bar}`}
                      style={{ width: `${Math.min(100, Math.max(6, progress))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: 'Reach',
                      value: c.reach,
                      icon: Eye,
                      fill: (c.reach / 20 / maxMetric) * 100,
                      tone: 'from-sky to-cyan-400',
                      soft: 'bg-sky-soft text-sky-bright',
                    },
                    {
                      label: 'Clicks',
                      value: c.clicks,
                      icon: Zap,
                      fill: (c.clicks / maxMetric) * 100,
                      tone: 'from-violet-500 to-fuchsia-400',
                      soft: 'bg-violet-50 text-violet-600',
                    },
                    {
                      label: 'Leads',
                      value: c.leads,
                      icon: UserPlus,
                      fill: ((c.leads * 30) / maxMetric) * 100,
                      tone: 'from-emerald-500 to-mint',
                      soft: 'bg-emerald-50 text-emerald-600',
                    },
                  ].map((m) => {
                    const MIcon = m.icon
                    return (
                      <div
                        key={m.label}
                        className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${m.tone} p-2.5 text-white shadow-sm`}
                      >
                        <MIcon className="absolute -right-1 -bottom-1 h-8 w-8 opacity-20" />
                        <p className="text-[10px] font-bold tracking-wide text-white/80 uppercase">
                          {m.label}
                        </p>
                        <p className="text-[15px] font-extrabold leading-tight">
                          {m.value >= 1000
                            ? `${(m.value / 1000).toFixed(1).replace(/\.0$/, '')}k`
                            : m.value}
                        </p>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/25">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{ width: `${Math.min(100, Math.max(12, m.fill))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {c.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => pause(c.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
                      >
                        <Pause className="h-3 w-3" />
                        Pause
                      </button>
                    )}
                    {c.status === 'paused' && (
                      <button
                        type="button"
                        onClick={() => resume(c.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-soft px-3 py-1.5 text-[12px] font-bold text-sky-bright hover:bg-sky/20"
                      >
                        <Play className="h-3 w-3" />
                        Resume
                      </button>
                    )}
                    {c.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => launch(c.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1.5 text-[12px] font-bold text-navy-deep shadow-sm hover:brightness-105"
                      >
                        <Play className="h-3 w-3" />
                        Launch
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCampaign(c)}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-soft px-3.5 py-1.5 text-[12px] font-bold text-sky-bright hover:bg-sky/20"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <Link
                      to={`/app/campaigns/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-sky-bright px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-violet-300/40 hover:brightness-110"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Insights
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {(showCreate || editingCampaign) && (
        <CreateCampaignModal
          campaign={editingCampaign ?? undefined}
          onClose={() => {
            setShowCreate(false)
            setEditingCampaign(null)
          }}
          onCreated={(id) => navigate(`/app/campaigns/${id}`)}
        />
      )}
    </div>
  )
}
