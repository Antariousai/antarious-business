import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  Compass,
  Eye,
  Flame,
  Hash,
  Lightbulb,
  Radio,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { PageHero } from '../components/PageHero'
import { PlatformChip } from '../components/PlatformIcon'
import { useDiscover } from '../context/DiscoverContext'
import { useLeads } from '../context/LeadsContext'
import {
  SIGNAL_TYPE_META,
  type DiscoverInsight,
  type DiscoverSignal,
  type SignalType,
  type TrendDirection,
} from '../data/discoverData'

type DiscoverTab = 'signals' | 'trends' | 'ideas' | 'competitors' | 'freya'

const STRENGTH_CHIP: Record<string, string> = {
  high: 'bg-gradient-to-r from-coral/20 to-rose-100 text-rose-600 ring-1 ring-coral/30',
  medium: 'bg-gradient-to-r from-sunshine/25 to-peach/30 text-amber-800 ring-1 ring-sunshine/40',
  low: 'bg-sky-soft text-sky-bright ring-1 ring-sky/25',
}

const STRENGTH_METER: Record<string, { pct: number; bar: string }> = {
  high: { pct: 92, bar: 'from-coral to-rose-500' },
  medium: { pct: 58, bar: 'from-sunshine to-peach' },
  low: { pct: 28, bar: 'from-sky to-sky-bright' },
}

const THREAT_CHIP: Record<string, string> = {
  high: 'bg-gradient-to-r from-coral/20 to-rose-100 text-rose-600 ring-1 ring-coral/30',
  medium: 'bg-gradient-to-r from-sunshine/25 to-peach/30 text-amber-800 ring-1 ring-sunshine/40',
  low: 'bg-gradient-to-r from-mint/20 to-emerald-100 text-emerald-700 ring-1 ring-mint/30',
}

const THREAT_METER: Record<string, { pct: number; bar: string }> = {
  high: { pct: 88, bar: 'from-coral to-rose-500' },
  medium: { pct: 55, bar: 'from-sunshine to-peach' },
  low: { pct: 22, bar: 'from-mint to-emerald-500' },
}

const TYPE_FILTER_CHIP: Record<SignalType | 'all', { active: string; idle: string }> = {
  all: {
    active: 'bg-navy-deep text-white shadow-sm',
    idle: 'bg-white text-ink ring-1 ring-sky/20 hover:bg-sky-soft/50',
  },
  Mention: {
    active: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-sm',
    idle: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200',
  },
  Hashtag: {
    active: 'bg-gradient-to-r from-sky to-sky-bright text-white shadow-sm shadow-sky/30',
    idle: 'bg-sky-soft text-sky-bright ring-1 ring-sky/25 hover:bg-sky/15',
  },
  Company: {
    active: 'bg-gradient-to-r from-sky-bright to-sky text-white shadow-sm',
    idle: 'bg-sky-soft text-sky-bright ring-1 ring-sky/25 hover:bg-sky-soft',
  },
  Competitor: {
    active: 'bg-gradient-to-r from-peach to-sunshine text-navy-deep shadow-sm',
    idle: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200 hover:bg-orange-200',
  },
  'Life Event': {
    active: 'bg-gradient-to-r from-coral to-rose-500 text-white shadow-sm shadow-coral/30',
    idle: 'bg-rose-100 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-200',
  },
}

const SIGNAL_ICON_BG: Record<SignalType, string> = {
  Mention: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-slate-300/40',
  Hashtag: 'bg-gradient-to-br from-sky to-sky-bright text-white shadow-sky/30',
  Company: 'bg-gradient-to-br from-sky-bright to-sky text-white shadow-sky/40',
  Competitor: 'bg-gradient-to-br from-sunshine to-peach text-navy-deep shadow-amber-200/50',
  'Life Event': 'bg-gradient-to-br from-coral to-rose-500 text-white shadow-coral/30',
}

const TREND_WASH: Record<TrendDirection, string> = {
  up: 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-white to-mint/10',
  emerging: 'border-sky/25 bg-gradient-to-br from-sky-soft/70 via-white to-sky-soft/40',
  steady: 'border-sunshine/30 bg-gradient-to-br from-amber-50/60 via-white to-peach/15',
}

const TREND_METER: Record<TrendDirection, { pct: number; bar: string }> = {
  up: { pct: 85, bar: 'from-mint to-emerald-500' },
  emerging: { pct: 62, bar: 'from-sky to-sky' },
  steady: { pct: 45, bar: 'from-sunshine to-peach' },
}

const CHANNEL_CHIP: Record<string, string> = {
  WhatsApp: 'bg-sky-soft text-sky-bright ring-1 ring-sky/25',
  Instagram: 'bg-gradient-to-r from-rose-100 to-orange-100 text-rose-600 ring-1 ring-rose/20',
  Facebook: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
}

const TAB_ACTIVE: Record<DiscoverTab, string> = {
  signals: 'from-sky-bright to-sky-bright',
  trends: 'from-mint to-emerald-500',
  ideas: 'from-sunshine to-peach',
  competitors: 'from-coral to-rose-500',
  freya: 'from-sky-bright to-sky-bright',
}

export function DiscoverPage() {
  const { newSignalCount, resetDemo, runRefresh, refreshing } = useDiscover()
  const [tab, setTab] = useState<DiscoverTab>('signals')

  return (
    <div className="absolute inset-0 flex min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="shrink-0 px-6 pt-5 pb-3">
          <PageHero
            accent="sky"
            title="Ideas"
            subtitle="Ideas Freya spots for your kind of business — so you post and follow up on what people want."
            action={
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void runRefresh().catch(() => resetDemo())}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[12px] font-bold text-sky-bright shadow-sm hover:bg-sky-soft disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh ideas'}
              </button>
            }
          />

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-sky-bright shadow-sm ring-1 ring-sky/25">
              <Sparkles className="h-3 w-3" />
              Freya-managed
            </span>
            {newSignalCount > 0 && (
              <span className="rounded-full bg-gradient-to-r from-coral to-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm shadow-coral/30">
                {newSignalCount} new signal{newSignalCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <nav className="mt-4 inline-flex flex-wrap gap-1 rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-sky/25">
            {(
              [
                { id: 'signals', label: 'For you', icon: Radio },
                { id: 'trends', label: 'Trends', icon: TrendingUp },
                { id: 'ideas', label: 'Post ideas', icon: Lightbulb },
                { id: 'competitors', label: 'Competitors', icon: Eye },
                { id: 'freya', label: 'Freya', icon: Sparkles },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                  tab === t.id
                    ? `bg-gradient-to-r ${TAB_ACTIVE[t.id]} text-white shadow-sm`
                    : 'text-slate-500 hover:bg-white/80 hover:text-ink'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {t.id === 'signals' && newSignalCount > 0 && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 text-[10px] font-bold ${
                      tab === t.id ? 'bg-white text-navy-deep' : 'bg-coral text-white'
                    }`}
                  >
                    {newSignalCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-0 flex-1">
          {tab === 'signals' && <SignalsTab />}
          {tab === 'trends' && <TrendsTab onOpenIdeas={() => setTab('ideas')} />}
          {tab === 'ideas' && <IdeasTab />}
          {tab === 'competitors' && <CompetitorsTab />}
          {tab === 'freya' && <FreyaTab onGo={(t) => setTab(t)} />}
        </div>
      </div>
    </div>
  )
}

function SignalsTab() {
  const {
    filteredSignals,
    typeFilter,
    setTypeFilter,
    markConverted,
    saveSignal,
    dismissSignal,
  } = useDiscover()
  const { addLead } = useLeads()
  const [toast, setToast] = useState<string | null>(null)

  function addAsLead(signal: DiscoverSignal) {
    if (signal.status === 'converted') return
    const nameMatch = signal.headline.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/)
    const name =
      signal.type === 'Company'
        ? signal.headline.split(' ')[0] + (signal.headline.includes('Events') ? ' Events' : '')
        : nameMatch?.[1] || 'New signal lead'
    const cleanName =
      signal.id === 's3'
        ? 'Petal Events'
        : signal.id === 's8'
          ? 'Horizon Chambers'
          : name

    addLead({
      name: cleanName,
      email: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`,
      company: signal.type === 'Company' ? cleanName : 'From Ideas',
      note: `${signal.headline}\n\nFreya: ${signal.freyaSuggestion}`,
      tags: [
        signal.type === 'Life Event' ? 'Wedding' : 'Local',
        signal.type === 'Competitor' ? 'Watch' : 'Freya-found',
      ].filter(Boolean),
      temp: signal.strength === 'high' ? 'hot' : 'warm',
      source: 'freya-found',
    })
    markConverted(signal.id)
    setToast(`Added ${cleanName} to Leads`)
    setTimeout(() => setToast(null), 2500)
  }

  const types: (SignalType | 'all')[] = [
    'all',
    'Mention',
    'Hashtag',
    'Company',
    'Competitor',
    'Life Event',
  ]

  return (
    <div className="px-6 py-5 pb-20">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-ink">Signal feed</h3>
          <p className="text-[13px] text-muted">
            Freya listens across Messenger, WhatsApp, Instagram, Facebook & the web.
          </p>
        </div>
        <Link
          to="/app/leads"
          className="rounded-full bg-sky-soft px-3 py-1.5 text-[12px] font-bold text-sky-bright ring-1 ring-sky/25 hover:bg-sky hover:text-white"
        >
          Open Leads board →
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {types.map((t) => {
          const chip = TYPE_FILTER_CHIP[t]
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                typeFilter === t ? chip.active : chip.idle
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          )
        })}
      </div>

      {toast && (
        <div className="mb-3 rounded-xl border border-mint/30 bg-gradient-to-r from-mint/15 to-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700 shadow-sm ring-1 ring-mint/20">
          {toast}{' '}
          <Link to="/app/leads" className="font-bold underline decoration-emerald-400">
            View board
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {filteredSignals.map((signal) => (
          <SignalCard
            key={signal.id}
            signal={signal}
            onAddLead={() => addAsLead(signal)}
            onSave={() => saveSignal(signal.id)}
            onDismiss={() => dismissSignal(signal.id)}
          />
        ))}
        {!filteredSignals.length && (
          <div className="overflow-hidden rounded-2xl border border-dashed border-sky/20 bg-gradient-to-br from-sky-soft/60 via-white to-sky-soft/40 px-6 py-14 text-center shadow-sm">
            <Radio className="mx-auto mb-3 h-10 w-10 text-sky-bright" />
            <p className="text-[15px] font-bold text-ink">No signals in this filter</p>
            <p className="mt-1 text-[13px] text-muted">Freya will add more as they appear.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SignalCard({
  signal,
  onAddLead,
  onSave,
  onDismiss,
}: {
  signal: DiscoverSignal
  onAddLead: () => void
  onSave: () => void
  onDismiss: () => void
}) {
  const meta = SIGNAL_TYPE_META[signal.type]
  const converted = signal.status === 'converted'
  const saved = signal.status === 'saved'
  const meter = STRENGTH_METER[signal.strength]

  return (
    <article className="group overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-md shadow-sky/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky/50">
      <div className="flex flex-wrap items-start gap-4 p-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md ${SIGNAL_ICON_BG[signal.type]}`}
        >
          {signal.type === 'Hashtag' ? (
            <Hash className="h-4 w-4" />
          ) : signal.type === 'Competitor' ? (
            <Eye className="h-4 w-4" />
          ) : signal.type === 'Life Event' ? (
            <Flame className="h-4 w-4" />
          ) : signal.type === 'Company' ? (
            <Users className="h-4 w-4" />
          ) : (
            <Radio className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.chip}`}>
              {meta.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-navy-deep/5 px-2 py-0.5 text-[11px] font-semibold text-muted">
              <PlatformChip platform={signal.platform} className="text-[11px] font-semibold" />
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STRENGTH_CHIP[signal.strength]}`}
            >
              {signal.strength}
            </span>
            {converted && (
              <span className="rounded-full bg-gradient-to-r from-mint/20 to-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-mint/30">
                Added to Leads
              </span>
            )}
            {saved && !converted && (
              <span className="rounded-full bg-sky-soft px-2 py-0.5 text-[10px] font-bold text-sky-bright ring-1 ring-sky/25">
                Saved
              </span>
            )}
            <span className="ml-auto text-[12px] font-medium text-muted">{signal.date}</span>
          </div>

          <p className="text-[14.5px] font-semibold leading-snug text-ink">{signal.headline}</p>
          <p className="mt-1.5 text-[13px] text-muted">{signal.whyItMatters}</p>

          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Strength</span>
            <div className="h-1.5 flex-1 max-w-[140px] overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${meter.bar}`}
                style={{ width: `${meter.pct}%` }}
              />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-sky/15 bg-gradient-to-r from-sky-soft/70 via-sky-soft/30 to-white px-3 py-2.5 ring-1 ring-sky/10">
            <div className="mb-0.5 flex items-center gap-1 text-[11px] font-bold text-sky-bright">
              <Sparkles className="h-3 w-3 text-sky-bright" />
              Freya suggests
            </div>
            <p className="text-[12.5px] text-ink">{signal.freyaSuggestion}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(signal.action === 'lead' || signal.action === 'watch') && (
              <button
                type="button"
                disabled={converted}
                onClick={onAddLead}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky to-sky-bright px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-sky/30 hover:brightness-105 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {converted ? 'Added as lead' : 'Add as lead'}
              </button>
            )}
            {signal.action === 'content' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-soft to-sky-soft px-3 py-1.5 text-[12px] font-bold text-sky-bright ring-1 ring-sky/20">
                <Lightbulb className="h-3.5 w-3.5 text-sunshine" />
                Content angle ready
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={converted || saved}
              className="inline-flex items-center gap-1 rounded-full border border-sky/25 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-sky-soft/50 disabled:opacity-50"
            >
              <Bookmark className="h-3.5 w-3.5 text-sunshine" />
              Save
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-coral"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function TrendsTab({ onOpenIdeas }: { onOpenIdeas: () => void }) {
  const { trends } = useDiscover()

  return (
    <div className="px-6 py-5 pb-20">
      <div className="mb-4">
        <h3 className="text-[16px] font-bold text-ink">Industry trends</h3>
        <p className="text-[13px] text-muted">
          What Freya sees rising for bakeries & caterers like yours.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {trends.map((t) => {
          const meter = TREND_METER[t.direction]
          return (
            <article
              key={t.id}
              className={`overflow-hidden rounded-2xl border p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${TREND_WASH[t.direction]}`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-sm ring-1 ring-sky/15">
                  {t.topic}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    t.direction === 'up'
                      ? 'bg-gradient-to-r from-mint/25 to-emerald-100 text-emerald-700 ring-1 ring-mint/30'
                      : t.direction === 'emerging'
                        ? 'bg-gradient-to-r from-sky-soft to-sky-soft text-sky-bright ring-1 ring-sky/25'
                        : 'bg-gradient-to-r from-sunshine/25 to-peach/30 text-amber-800 ring-1 ring-sunshine/40'
                  }`}
                >
                  {t.changeLabel}
                </span>
              </div>
              <h4 className="text-[15px] font-bold text-ink">{t.title}</h4>
              <p className="mt-1 text-[13px] text-muted">{t.summary}</p>

              <div className="mt-3 flex items-center gap-2">
                <TrendingUp
                  className={`h-3.5 w-3.5 shrink-0 ${
                    t.direction === 'up'
                      ? 'text-emerald-500'
                      : t.direction === 'emerging'
                        ? 'text-sky-bright'
                        : 'text-sunshine'
                  }`}
                />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/70 ring-1 ring-black/5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${meter.bar}`}
                    style={{ width: `${meter.pct}%` }}
                  />
                </div>
              </div>

              <p className="mt-3 rounded-lg bg-white/60 px-2.5 py-2 text-[12.5px] font-medium text-ink ring-1 ring-sky/10">
                <Sparkles className="mr-1 inline h-3.5 w-3.5 text-sky-bright" />
                {t.freyaTip}
              </p>
            </article>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onOpenIdeas}
        className="mt-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sunshine/20 to-peach/30 px-4 py-2 text-[13px] font-bold text-amber-800 ring-1 ring-sunshine/40 hover:from-sunshine/30"
      >
        Turn trends into content ideas →
      </button>
    </div>
  )
}

function IdeasTab() {
  const { ideas, saveIdea, useIdea } = useDiscover()

  return (
    <div className="px-6 py-5 pb-20">
      <div className="mb-4">
        <h3 className="text-[16px] font-bold text-ink">Content ideas</h3>
        <p className="text-[13px] text-muted">
          Drafted from signals & trends — save them or mark as used when you post.
        </p>
      </div>
      <div className="space-y-3">
        {ideas.map((idea) => (
          <article
            key={idea.id}
            className="flex flex-wrap items-start gap-4 rounded-2xl border border-sunshine/25 bg-gradient-to-br from-amber-50/50 via-white to-sky-soft/20 p-4 shadow-md shadow-amber-100/30 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sunshine to-peach text-navy-deep shadow-md shadow-amber-200/50">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    CHANNEL_CHIP[idea.channel] || 'bg-sky-soft text-sky-bright ring-1 ring-sky/25'
                  }`}
                >
                  {idea.channel}
                </span>
                <span className="rounded-full bg-sky-soft px-2 py-0.5 text-[11px] font-bold text-sky-bright ring-1 ring-sky/25">
                  {idea.format}
                </span>
                {idea.status !== 'suggested' && (
                  <span className="rounded-full bg-gradient-to-r from-mint/20 to-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-mint/30">
                    {idea.status}
                  </span>
                )}
              </div>
              <h4 className="text-[14.5px] font-bold text-ink">{idea.title}</h4>
              <p className="mt-1 text-[13px] text-muted">{idea.angle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => saveIdea(idea.id)}
                  disabled={idea.status !== 'suggested'}
                  className="rounded-full border border-sky/25 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-sky-soft/50 disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => useIdea(idea.id)}
                  disabled={idea.status === 'used'}
                  className="rounded-full bg-gradient-to-r from-sky to-sky-bright px-3 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-sky/25 hover:brightness-105 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                  Mark used
                </button>
                <Link
                  to="/app/content"
                  className="rounded-full bg-coral/10 px-3 py-1.5 text-[12px] font-bold text-coral ring-1 ring-coral/25 hover:bg-coral/20"
                >
                  Open Content →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function CompetitorsTab() {
  const { competitors } = useDiscover()

  return (
    <div className="px-6 py-5 pb-20">
      <div className="mb-4">
        <h3 className="text-[16px] font-bold text-ink">Competitor watch</h3>
        <p className="text-[13px] text-muted">
          Freya tracks nearby bakeries & caterers so you can respond, not react late.
        </p>
      </div>
      <div className="space-y-3">
        {competitors.map((c) => {
          const meter = THREAT_METER[c.threat]
          return (
            <article
              key={c.id}
              className="overflow-hidden rounded-2xl border border-coral/15 bg-white p-4 shadow-md shadow-coral/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-100/40"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h4 className="text-[15px] font-bold text-ink">{c.name}</h4>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${THREAT_CHIP[c.threat]}`}
                >
                  {c.threat} threat
                </span>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Threat level</span>
                <div className="h-2 flex-1 max-w-[180px] overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${meter.bar}`}
                    style={{ width: `${meter.pct}%` }}
                  />
                </div>
              </div>

              <p className="text-[13px] text-muted">{c.note}</p>
              <p className="mt-2 text-[13px] font-semibold text-ink">
                Latest move: <span className="font-medium text-muted">{c.lastMove}</span>
              </p>
              <div className="mt-3 rounded-xl border border-sky/15 bg-gradient-to-r from-sky-soft/60 via-sky-soft/40 to-white px-3 py-2.5 ring-1 ring-sky/10">
                <span className="font-bold text-sky-bright">Freya's take — </span>
                {c.freyaTake}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function FreyaTab({ onGo }: { onGo: (t: DiscoverTab) => void }) {
  const { insights, dismissInsight, newSignalCount, trends, ideas } = useDiscover()

  return (
    <div className="px-6 py-5 pb-20">
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-sky/20 bg-gradient-to-br from-sky-bright/90 via-sky-bright/80 to-mint/70 p-5 text-white shadow-lg shadow-sky/30">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2">
            <Compass className="h-5 w-5" />
            <span className="text-[13px] font-bold">How Freya finds ideas</span>
          </div>
          <p className="max-w-2xl text-[14px] leading-relaxed text-white/90">
            I watch mentions, hashtags, company moves, life events, and competitor ads. Strong signals
            land in your feed. You add people to Leads, save content ideas, or dismiss noise — I keep
            scanning.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-bold backdrop-blur-sm ring-1 ring-white/30">
              {newSignalCount} new signals
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-bold backdrop-blur-sm ring-1 ring-white/30">
              {trends.length} trends
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-bold backdrop-blur-sm ring-1 ring-white/30">
              {ideas.filter((i) => i.status === 'suggested').length} ideas ready
            </span>
          </div>
        </div>
      </div>

      <h3 className="mb-3 text-[16px] font-bold text-ink">Freya digest</h3>
      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onDismiss={() => dismissInsight(insight.id)}
            onGo={onGo}
          />
        ))}
        {!insights.length && (
          <div className="rounded-2xl border border-dashed border-mint/30 bg-gradient-to-br from-mint/10 via-white to-sky-soft/30 px-6 py-10 text-center">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-mint" />
            <p className="text-[14px] font-bold text-ink">You're caught up — nice work.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function InsightCard({
  insight,
  onDismiss,
  onGo,
}: {
  insight: DiscoverInsight
  onDismiss: () => void
  onGo: (t: DiscoverTab) => void
}) {
  const toneStyles =
    insight.tone === 'risk'
      ? {
          wrap: 'border-coral/25 bg-gradient-to-br from-rose-50/80 via-white to-coral/5 shadow-md shadow-coral/10',
          btn: 'bg-gradient-to-r from-coral to-rose-500 shadow-sm shadow-coral/30',
        }
      : insight.tone === 'win'
        ? {
            wrap: 'border-mint/30 bg-gradient-to-br from-emerald-50/80 via-white to-mint/10 shadow-md shadow-emerald-100/40',
            btn: 'bg-gradient-to-r from-mint to-emerald-500 shadow-sm shadow-emerald-300/40',
          }
        : insight.tone === 'action'
          ? {
              wrap: 'border-sky/25 bg-gradient-to-br from-sky-soft/70 via-white to-sky-soft/40 shadow-md shadow-sky/10',
              btn: 'bg-gradient-to-r from-sky-bright to-sky-bright shadow-sm shadow-sky/30',
            }
          : {
              wrap: 'border-sky/15 bg-white shadow-md shadow-sky/5',
              btn: 'bg-navy-deep shadow-sm',
            }

  return (
    <article className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${toneStyles.wrap}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-[14.5px] font-bold text-ink">{insight.title}</h4>
          <p className="mt-1 text-[13px] text-muted">{insight.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {insight.goTo && insight.actionLabel && (
              <button
                type="button"
                onClick={() => onGo(insight.goTo!)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold text-white hover:brightness-105 ${toneStyles.btn}`}
              >
                {insight.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
