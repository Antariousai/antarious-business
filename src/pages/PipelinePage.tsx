import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { FreyaAvatar } from '../components/FreyaAvatar'
import { FreyaCreationAssist } from '../components/FreyaCreationAssist'
import { AddDealModal } from '../components/AddDealModal'
import { freyaFillCompany, freyaFillContact } from '../lib/freyaCreationHelpers'
import { DealDetailPanel } from '../components/DealDetailPanel'
import { useCrm } from '../context/CrmContext'
import { useApp } from '../context/AppContext'
import {
  ACTIVITY_LABEL,
  DEAL_STAGES,
  SEGMENT_LABEL,
  forecastValue,
  formatMoney,
  formatShortDate,
  isOverdue,
  stageMeta,
  type CrmActivity,
  type CrmDeal,
  type CrmSegment,
  type DealStage,
  type FreyaInsight,
} from '../data/crmData'

type CrmTab = 'overview' | 'deals' | 'contacts' | 'companies' | 'activities' | 'freya'
type DealView = 'board' | 'table'
type SegmentFilter = 'all' | CrmSegment

export function PipelinePage() {
  const { planTier } = useApp()
  const isStarter = planTier === 'starter'
  const crm = useCrm()
  const [tab, setTab] = useState<CrmTab>(isStarter ? 'deals' : 'overview')
  const [segment, setSegment] = useState<SegmentFilter>('all')
  const [showAddDeal, setShowAddDeal] = useState(false)
  const [addStage, setAddStage] = useState<DealStage>('qualified')

  const selected = crm.deals.find((d) => d.id === crm.selectedDealId) || null

  const tabs = (
    isStarter
      ? [
          { id: 'deals' as const, label: 'Deals', icon: Wallet },
          { id: 'contacts' as const, label: 'People', icon: Users },
        ]
      : [
          { id: 'overview' as const, label: 'Overview', icon: Target },
          { id: 'deals' as const, label: 'Deals', icon: Wallet },
          { id: 'contacts' as const, label: 'Contacts', icon: Users },
          { id: 'companies' as const, label: 'Companies', icon: Building2 },
          { id: 'activities' as const, label: 'Activities', icon: Activity },
          { id: 'freya' as const, label: 'Freya', icon: Sparkles },
        ]
  )

  return (
    <div className="absolute inset-0 flex min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <header className="relative shrink-0 overflow-hidden border-b border-sky/15 bg-gradient-to-r from-sky-soft/70 via-white to-violet-50/60 px-6 pt-5 pb-3">
          <div className="pointer-events-none absolute -top-8 right-24 h-24 w-24 rounded-full bg-coral/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-4 left-12 h-20 w-20 rounded-full bg-sky/20 blur-2xl" />
          <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[22px] font-bold tracking-tight text-ink">Customers</h2>
                <span className="rounded-full bg-gradient-to-r from-sky-bright to-violet-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm shadow-sky/30">
                  Freya helps
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted">
                {isStarter
                  ? 'Your people and deals — keep it simple.'
                  : 'People, deals, and next steps — in plain words.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isStarter && <SegmentPills value={segment} onChange={setSegment} />}
              <button
                type="button"
                onClick={() => {
                  setAddStage('qualified')
                  setShowAddDeal(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-peach px-4 py-2 text-[13px] font-bold text-white shadow-sm shadow-orange-300/40 hover:brightness-110"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                {isStarter ? 'Add deal' : 'Create deal'}
              </button>
            </div>
          </div>

          <nav className="relative flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                  tab === t.id
                    ? 'bg-gradient-to-r from-sky-bright via-violet-500 to-rose-400 text-white shadow-sm shadow-sky/30'
                    : 'text-slate-500 hover:bg-white/80 hover:text-ink'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {!isStarter && t.id === 'activities' && crm.totals.tasksDue > 0 && (
                  <span className="ml-0.5 rounded-full bg-sky px-1.5 text-[10px] text-white">
                    {crm.totals.tasksDue}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!isStarter && tab === 'overview' && (
            <OverviewTab
              segment={segment}
              onOpenDeals={() => setTab('deals')}
              onOpenFreya={() => setTab('freya')}
              onOpenActivities={() => setTab('activities')}
            />
          )}
          {tab === 'deals' && (
            <DealsTab
              segment={isStarter ? 'all' : segment}
              simple={isStarter}
              onAdd={(stage) => {
                setAddStage(stage)
                setShowAddDeal(true)
              }}
            />
          )}
          {tab === 'contacts' && (
            <ContactsTab segment={isStarter ? 'all' : segment} simple={isStarter} />
          )}
          {!isStarter && tab === 'companies' && <CompaniesTab segment={segment} />}
          {!isStarter && tab === 'activities' && <ActivitiesTab segment={segment} />}
          {!isStarter && tab === 'freya' && (
            <FreyaTab
              segment={segment}
              onOpenDeal={(id) => {
                crm.selectDeal(id)
                setTab('deals')
              }}
            />
          )}
        </div>
      </div>

      {selected && tab === 'deals' && <DealDetailPanel deal={selected} />}
      {showAddDeal && (
        <AddDealModal onClose={() => setShowAddDeal(false)} defaultStage={addStage} />
      )}
    </div>
  )
}

function SegmentPills({
  value,
  onChange,
}: {
  value: SegmentFilter
  onChange: (v: SegmentFilter) => void
}) {
  return (
    <div className="inline-flex rounded-full border border-sky/20 bg-white/90 p-0.5 shadow-sm">
      {(
        [
          { id: 'all', label: 'All' },
          { id: 'b2b', label: 'Business' },
          { id: 'b2c', label: 'People' },
        ] as const
      ).map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
            value === s.id
              ? s.id === 'b2b'
                ? 'bg-gradient-to-r from-sky-bright to-violet-500 text-white shadow-sm'
                : s.id === 'b2c'
                  ? 'bg-gradient-to-r from-rose-400 to-coral text-white shadow-sm'
                  : 'bg-gradient-to-r from-navy-mid to-sky-bright text-white shadow-sm'
              : 'text-slate-500 hover:text-ink'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

function OverviewTab({
  segment,
  onOpenDeals,
  onOpenFreya,
  onOpenActivities,
}: {
  segment: SegmentFilter
  onOpenDeals: () => void
  onOpenFreya: () => void
  onOpenActivities: () => void
}) {
  const { deals, contacts, companies, activities, insights, totals } = useCrm()
  const openDeals = deals.filter(
    (d) =>
      !stageMeta(d.stage).isClosed && (segment === 'all' || d.segment === segment),
  )
  const due = activities.filter(
    (a) => !a.done && (segment === 'all' || a.segment === segment),
  )
  const topInsights = insights
    .filter((i) => segment === 'all' || i.segment === 'both' || i.segment === segment)
    .slice(0, 3)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 pb-20">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Open pipeline"
          value={formatMoney(
            segment === 'all'
              ? totals.openValue
              : segment === 'b2b'
                ? totals.b2bOpen
                : totals.b2cOpen,
          )}
          sub={`${openDeals.length} open deals`}
          icon={Wallet}
          tone="sky"
        />
        <Kpi
          label="Weighted forecast"
          value={formatMoney(totals.forecast)}
          sub="By stage probability"
          icon={TrendingUp}
          tone="violet"
        />
        <Kpi
          label="People & accounts"
          value={`${totals.contacts}`}
          sub={`${totals.companies} companies`}
          icon={Users}
          tone="green"
        />
        <Kpi
          label="Freya's queue"
          value={`${due.length}`}
          sub="Activities still open"
          icon={Sparkles}
          tone="orange"
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-sky/15 bg-gradient-to-br from-sky-soft/50 via-white to-violet-50/40 p-4 shadow-sm shadow-sky/10 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">Deals by stage</h3>
            <button type="button" onClick={onOpenDeals} className="text-[12px] font-semibold text-sky">
              Open deals →
            </button>
          </div>
          <div className="space-y-2.5">
            {DEAL_STAGES.filter((s) => !s.isClosed).map((stage) => {
              const stageDeals = openDeals.filter((d) => d.stage === stage.id)
              const value = stageDeals.reduce((s, d) => s + d.value, 0)
              const max = Math.max(...DEAL_STAGES.filter((x) => !x.isClosed).map((st) => {
                const v = openDeals.filter((d) => d.stage === st.id).reduce((a, d) => a + d.value, 0)
                return v
              }), 1)
              return (
                <div key={stage.id}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-ink">{stage.label}</span>
                    <span className="text-muted">
                      {stageDeals.length} · {formatMoney(value)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full shadow-sm"
                      style={{
                        width: `${Math.max(4, Math.round((value / max) * 100))}%`,
                        background: stage.statusColor,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-sky/25 bg-gradient-to-br from-navy-deep via-navy-mid to-violet-600/70 p-4 text-white shadow-md shadow-navy/30">
          <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-sunshine/20 blur-2xl" />
          <div className="relative mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-bright to-violet-500 shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-[15px] font-bold">Freya digest</h3>
          </div>
          <p className="relative mb-3 text-[13px] leading-relaxed text-slate-300">
            Mix today:{' '}
            <span className="font-semibold text-white">
              {formatMoney(totals.b2bOpen)} business
            </span>{' '}
            —{' '}
            <span className="font-semibold text-white">
              {formatMoney(totals.b2cOpen)} people
            </span>
            . I&apos;ll keep both lanes moving — you just approve.
          </p>
          <button
            type="button"
            onClick={onOpenFreya}
            className="relative rounded-full bg-gradient-to-r from-sky-bright to-violet-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm"
          >
            See Freya&apos;s plan
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-rose-200/40 bg-gradient-to-br from-rose-50/40 via-white to-peach/30 p-4 shadow-sm shadow-rose-200/15">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">Needs attention</h3>
            <button
              type="button"
              onClick={onOpenActivities}
              className="text-[12px] font-semibold text-sky"
            >
              All activities →
            </button>
          </div>
          <div className="space-y-2">
            {due.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 shadow-sm"
              >
                <span className="mt-0.5 rounded-full bg-gradient-to-r from-violet-500 to-sky-bright px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                  {ACTIVITY_LABEL[a.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{a.title}</div>
                  <div className="text-[11px] text-muted">
                    {a.relatedLabel} · due {formatShortDate(a.dueDate)}
                    {a.freyaDrafted ? ' · Freya drafted' : ''}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    a.segment === 'b2b' ? 'bg-sky-soft text-sky-bright' : 'bg-pink-100 text-pink-600'
                  }`}
                >
                  {SEGMENT_LABEL[a.segment]}
                </span>
              </div>
            ))}
            {!due.length && (
              <p className="py-6 text-center text-[13px] text-muted">All clear — nothing due.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-violet-200/40 bg-gradient-to-br from-violet-50/50 via-white to-sky-soft/40 p-4 shadow-sm shadow-violet-200/15">
          <h3 className="mb-3 text-[15px] font-bold text-ink">Freya insights</h3>
          <div className="space-y-2">
            {topInsights.map((i) => (
              <InsightCard key={i.id} insight={i} compact />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Contacts" value={String(contacts.filter((c) => segment === 'all' || c.segment === segment).length)} />
        <MiniStat label="Companies" value={String(companies.filter((c) => segment === 'all' || c.segment === segment).length)} />
        <MiniStat label="Won value" value={formatMoney(totals.won)} />
      </div>
    </div>
  )
}

function DealsTab({
  segment,
  onAdd,
  simple = false,
}: {
  segment: SegmentFilter
  onAdd: (stage: DealStage) => void
  simple?: boolean
}) {
  const { deals, selectedDealId, selectDeal, moveDeal, updateDeal, totals } = useCrm()
  const [view, setView] = useState<DealView>('board')
  const [query, setQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'Joy' | 'Freya'>('all')
  const [hideClosed, setHideClosed] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<DealStage | null>(null)
  const [collapsed, setCollapsed] = useState<Set<DealStage>>(new Set())

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (segment !== 'all' && d.segment !== segment) return false
      if (!simple && ownerFilter !== 'all' && d.owner !== ownerFilter) return false
      if (hideClosed && stageMeta(d.stage).isClosed) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!`${d.title} ${d.company} ${d.contact} ${d.product}`.toLowerCase().includes(q))
          return false
      }
      return true
    })
  }, [deals, segment, ownerFilter, hideClosed, query, simple])

  const stageTotals = useMemo(() => {
    const map = Object.fromEntries(
      DEAL_STAGES.map((s) => [s.id, { count: 0, value: 0 }]),
    ) as Record<DealStage, { count: number; value: number }>
    for (const d of filtered) {
      map[d.stage].count += 1
      map[d.stage].value += d.value
    }
    return map
  }, [filtered])

  const visibleStages = hideClosed ? DEAL_STAGES.filter((s) => !s.isClosed) : DEAL_STAGES

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-20">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {!simple && (
          <div className="inline-flex rounded-full border border-sky/20 bg-white/90 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setView('board')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                view === 'board'
                  ? 'bg-gradient-to-r from-sky-bright to-violet-500 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                view === 'table'
                  ? 'bg-gradient-to-r from-sky-bright to-violet-500 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
          </div>
        )}
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={simple ? 'Search deals…' : 'Search deals, products…'}
            className="h-8 w-52 rounded-md border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-sky"
          />
        </label>
        {!simple && (
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value as typeof ownerFilter)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px] font-semibold outline-none"
          >
            <option value="all">All owners</option>
            <option value="Joy">Joy</option>
            <option value="Freya">Freya</option>
          </select>
        )}
        <button
          type="button"
          onClick={() => setHideClosed((v) => !v)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold ${
            hideClosed
              ? 'border-sky bg-sky-soft text-sky-bright'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {hideClosed ? 'Open only' : 'Include closed'}
        </button>
        <span className="ml-auto text-[12px] text-muted">
          {filtered.length} deals · {formatMoney(filtered.reduce((s, d) => s + d.value, 0))}
          {!simple && (
            <>
              {' '}
              · forecast {formatMoney(totals.forecast)}
            </>
          )}
        </span>
      </div>

      {(simple || view === 'board') && (
        <div className="kanban-board flex items-start gap-3 overflow-x-auto pb-2">
          {visibleStages.map((stage) => {
            const columnDeals = filtered.filter((d) => d.stage === stage.id)
            const isOver = overStage === stage.id
            const isCollapsed = collapsed.has(stage.id)
            const t = stageTotals[stage.id]
            if (isCollapsed) {
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => {
                      const n = new Set(prev)
                      n.delete(stage.id)
                      return n
                    })
                  }
                  className="flex w-10 shrink-0 flex-col items-center self-stretch rounded-lg border border-slate-200 bg-white py-3"
                >
                  <ChevronRight className="mb-2 h-4 w-4 text-slate-400" />
                  <span
                    className="text-[11px] font-bold text-slate-600"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {stage.label} ({t.count})
                  </span>
                </button>
              )
            }
            return (
              <section
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (overStage !== stage.id) setOverStage(stage.id)
                }}
                onDragLeave={(e) => {
                  const next = e.relatedTarget as Node | null
                  if (next && e.currentTarget.contains(next)) return
                  setOverStage((cur) => (cur === stage.id ? null : cur))
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const id =
                    e.dataTransfer.getData('text/deal-id') ||
                    e.dataTransfer.getData('text/plain') ||
                    draggingId
                  if (id) moveDeal(id, stage.id)
                  setDraggingId(null)
                  setOverStage(null)
                }}
                className={`flex w-[280px] min-w-[250px] shrink-0 flex-col rounded-xl border bg-gradient-to-b from-white via-sky-soft/20 to-violet-50/30 shadow-sm ${
                  isOver ? 'border-sky ring-2 ring-sky/30' : 'border-sky/15'
                }`}
              >
                <header className="flex shrink-0 items-center gap-2 border-b border-sky/10 bg-gradient-to-r from-white to-sky-soft/30 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => new Set(prev).add(stage.id))
                    }
                    className="text-slate-400"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: stage.statusColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-ink">{stage.label}</div>
                    <div className="text-[11px] text-muted">
                      {t.count} · {formatMoney(t.value)} · {stage.probability}%
                    </div>
                  </div>
                  <button type="button" onClick={() => onAdd(stage.id)} className="text-slate-400 hover:text-ink">
                    <Plus className="h-4 w-4" />
                  </button>
                </header>
                <div className="kanban-column flex flex-col gap-2 p-2">
                  {columnDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      dragging={draggingId === deal.id}
                      selected={selectedDealId === deal.id}
                      onOpen={() => selectDeal(deal.id)}
                      onDragStart={setDraggingId}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setOverStage(null)
                      }}
                    />
                  ))}
                  {isOver && (
                    <div className="rounded-lg border-2 border-dashed border-sky bg-sky-soft/40 px-3 py-5 text-center text-[12px] font-semibold text-sky">
                      Drop here
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {!simple && view === 'table' && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[1200px] border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#f6f7fb] text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="border-b border-slate-200 px-4 py-2.5">Deal</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Type</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Stage</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Owner</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Value</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Product</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Close</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Forecast</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Next step</th>
              </tr>
            </thead>
            <tbody>
              {visibleStages.map((stage) => {
                const rows = filtered.filter((d) => d.stage === stage.id)
                if (!rows.length) return null
                return (
                  <DealTableGroup
                    key={stage.id}
                    stage={stage}
                    deals={rows}
                    total={stageTotals[stage.id].value}
                    onOpen={selectDeal}
                    onMove={moveDeal}
                    onUpdate={updateDeal}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ContactsTab({ segment, simple = false }: { segment: SegmentFilter; simple?: boolean }) {
  const { contacts, addContact, updateContact } = useCrm()
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const list = contacts.filter((c) => {
    if (segment !== 'all' && c.segment !== segment) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return `${c.name} ${c.email} ${c.companyName} ${c.tags.join(' ')}`.toLowerCase().includes(q)
  })
  const selected = contacts.find((c) => c.id === selectedId) || null

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-6 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={simple ? 'Search people…' : 'Search contacts…'}
              className="h-8 w-56 rounded-md border border-slate-200 pr-3 pl-8 text-[12px] outline-none focus:border-sky"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-sky px-3 py-1.5 text-[12px] font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> {simple ? 'Add person' : 'Add contact'}
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-16">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-3 text-left shadow-sm ${
                selectedId === c.id ? 'border-sky ring-2 ring-sky/20' : 'border-slate-100'
              }`}
            >
              <Avatar letter={c.name.charAt(0)} size={40} color={c.color} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-ink">{c.name}</span>
                  {!simple && <SegBadge segment={c.segment} />}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
                    {c.status}
                  </span>
                </div>
                <div className="truncate text-[12px] text-muted">
                  {c.title ? `${c.title} · ` : ''}
                  {c.companyName} · {c.email}
                </div>
                {!simple && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {!simple && (
                <div className="text-right text-[11px] text-muted">
                  <div className="font-semibold text-ink">{formatMoney(c.lifetimeValue)}</div>
                  LTV
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <aside className="w-full max-w-[360px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start gap-3">
            <Avatar letter={selected.name.charAt(0)} size={48} color={selected.color} />
            <div>
              <div className="text-[18px] font-bold text-ink">{selected.name}</div>
              <div className="text-[12px] text-muted">{selected.title || 'Contact'}</div>
              <div className="mt-1 flex gap-1">
                <SegBadge segment={selected.segment} />
              </div>
            </div>
          </div>
          <DetailLine icon={Mail} label="Email" value={selected.email} />
          <DetailLine icon={Phone} label="Phone" value={selected.phone || '—'} />
          <DetailLine icon={Building2} label="Company" value={selected.companyName} />
          <DetailLine icon={User} label="Owner" value={selected.owner} />
          <div className="mt-4">
            <label className="mb-1 block text-[11px] font-bold tracking-wide text-muted uppercase">Next step</label>
            <input
              value={selected.nextStep}
              onChange={(e) => updateContact(selected.id, { nextStep: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
            />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-bold tracking-wide text-muted uppercase">Notes</label>
            <textarea
              value={selected.notes}
              onChange={(e) => updateContact(selected.id, { notes: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-sky"
            />
          </div>
          <p className="mt-3 text-[12px] text-muted">Last touch: {selected.lastTouch}</p>
        </aside>
      )}
      {showAdd && (
        <AddContactModal
          defaultSegment={segment === 'all' ? 'b2c' : segment}
          onClose={() => setShowAdd(false)}
          onAdd={(input) => {
            const c = addContact(input)
            setSelectedId(c.id)
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}

function CompaniesTab({ segment }: { segment: SegmentFilter }) {
  const { companies, addCompany, updateCompany, deals, contacts } = useCrm()
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const list = companies.filter((c) => {
    if (segment !== 'all' && c.segment !== segment) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return `${c.name} ${c.domain} ${c.industry}`.toLowerCase().includes(q)
  })
  const selected = companies.find((c) => c.id === selectedId) || null
  const relatedDeals = selected ? deals.filter((d) => d.companyId === selected.id || d.company === selected.name) : []
  const relatedContacts = selected ? contacts.filter((c) => c.companyId === selected.id || c.companyName === selected.name) : []

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-6 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies?"
              className="h-8 w-56 rounded-md border border-slate-200 pr-3 pl-8 text-[12px] outline-none focus:border-sky"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-sky px-3 py-1.5 text-[12px] font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add company
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pb-16 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm ${
                selectedId === c.id ? 'border-sky ring-2 ring-sky/20' : 'border-slate-100'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[14px] font-bold text-white"
                    style={{ background: c.color }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-ink">{c.name}</div>
                    <div className="text-[11px] text-muted">{c.domain || c.industry}</div>
                  </div>
                </div>
                <SegBadge segment={c.segment} />
              </div>
              <div className="mb-2 text-[12px] text-slate-600">
                {c.industry} · {c.size} · {c.city || '—'}
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-bold text-ink">{formatMoney(c.annualPotential)}</span>
                <span className="capitalize text-muted">{c.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <aside className="w-full max-w-[360px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5">
          <div className="mb-1 text-[18px] font-bold text-ink">{selected.name}</div>
          <div className="mb-3 flex gap-1">
            <SegBadge segment={selected.segment} />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
              {selected.status}
            </span>
          </div>
          <DetailLine icon={Building2} label="Industry" value={selected.industry} />
          <DetailLine icon={Users} label="Size" value={selected.size} />
          <DetailLine icon={Mail} label="Domain" value={selected.domain || '—'} />
          <div className="mt-4">
            <label className="mb-1 block text-[11px] font-bold tracking-wide text-muted uppercase">Next step</label>
            <input
              value={selected.nextStep}
              onChange={(e) => updateCompany(selected.id, { nextStep: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
            />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-[12px] font-bold text-ink">Related deals ({relatedDeals.length})</div>
            {relatedDeals.map((d) => (
              <div key={d.id} className="mb-1 rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
                <span className="font-semibold">{d.title}</span>
                <span className="text-muted"> · {formatMoney(d.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="mb-2 text-[12px] font-bold text-ink">People ({relatedContacts.length})</div>
            {relatedContacts.map((c) => (
              <div key={c.id} className="mb-1 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
                <Avatar letter={c.name.charAt(0)} size={22} color={c.color} />
                {c.name}
              </div>
            ))}
          </div>
        </aside>
      )}
      {showAdd && (
        <AddCompanyModal
          onClose={() => setShowAdd(false)}
          onAdd={(input) => {
            const c = addCompany(input)
            setSelectedId(c.id)
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}

function ActivitiesTab({ segment }: { segment: SegmentFilter }) {
  const { activities, toggleActivity } = useCrm()
  const [showDone, setShowDone] = useState(false)
  const list = activities.filter((a) => {
    if (segment !== 'all' && a.segment !== segment) return false
    if (!showDone && a.done) return false
    return true
  })

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 pb-20">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-muted">
          Freya drafts many of these — you tap done when finished.
        </p>
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          className="text-[12px] font-semibold text-sky"
        >
          {showDone ? 'Hide completed' : 'Show completed'}
        </button>
      </div>
      <div className="space-y-2">
        {list.map((a) => (
          <ActivityRow key={a.id} activity={a} onToggle={() => toggleActivity(a.id)} />
        ))}
        {!list.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-muted">
            No open activities — Freya will add more as deals move.
          </div>
        )}
      </div>
    </div>
  )
}

function FreyaTab({
  segment,
  onOpenDeal,
}: {
  segment: SegmentFilter
  onOpenDeal: (id: string) => void
}) {
  const { insights, dismissInsight, totals, activities } = useCrm()
  const list = insights.filter(
    (i) => segment === 'all' || i.segment === 'both' || i.segment === segment,
  )
  const drafted = activities.filter((a) => a.freyaDrafted && !a.done).length

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 pb-20">
      <div className="mb-5 overflow-hidden rounded-2xl bg-navy-mid px-5 py-5 text-white">
        <div className="mb-2 flex items-center gap-2">
          <FreyaAvatar size={40} online />
          <div>
            <div className="text-[16px] font-bold">Freya&apos;s customer digest</div>
            <div className="text-[12px] text-slate-300">I watch every deal, person, and follow-up.</div>
          </div>
        </div>
        <p className="max-w-2xl text-[14px] leading-relaxed text-slate-300">
          Right now I&apos;m tracking {totals.openCount} open deals (
          {formatMoney(totals.b2bOpen)} business / {formatMoney(totals.b2cOpen)} people), {drafted} drafted
          follow-ups waiting for your OK, and {totals.tasksDue} open activities.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onDismiss={() => dismissInsight(insight.id)}
            onAction={() => {
              if (insight.relatedType === 'deal' && insight.relatedId) onOpenDeal(insight.relatedId)
            }}
          />
        ))}
        {!list.length && (
          <div className="col-span-2 rounded-2xl border border-dashed border-slate-200 py-16 text-center text-muted">
            You're caught up — Freya will surface new insights as the pipeline moves.
          </div>
        )}
      </div>
    </div>
  )
}

function DealCard({
  deal,
  dragging,
  selected,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  deal: CrmDeal
  dragging?: boolean
  selected?: boolean
  onOpen: () => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
}) {
  const overdue = isOverdue(deal)
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', deal.id)
        e.dataTransfer.setData('text/deal-id', deal.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(deal.id)
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`group cursor-grab overflow-hidden rounded-xl border bg-gradient-to-br from-white via-white to-sky-soft/25 p-3 shadow-sm select-none transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
        dragging
          ? 'opacity-40 ring-2 ring-sky'
          : selected
            ? 'border-sky ring-2 ring-sky/25'
            : overdue
              ? 'border-rose-300 from-rose-50/50 to-peach/30'
              : 'border-sky/15 hover:border-sky/30'
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 text-[13px] font-bold leading-snug text-ink">{deal.title}</div>
        <SegBadge segment={deal.segment} />
      </div>
      <div className="mb-2 bg-gradient-to-r from-sky-bright to-violet-500 bg-clip-text text-[16px] font-bold text-transparent">
        {formatMoney(deal.value)}
      </div>
      <div className="mb-2 space-y-1 text-[11.5px] text-slate-600">
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="h-3 w-3 text-slate-400" /> {deal.company}
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <User className="h-3 w-3 text-slate-400" /> {deal.contact}
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-slate-400" /> {formatShortDate(deal.closeDate)}
          {overdue && <span className="font-bold text-red-500">Overdue</span>}
        </div>
      </div>
      <div className="mb-2 text-[11px] text-slate-500">{deal.product}</div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex items-center gap-1.5">
          <Avatar letter={deal.owner.charAt(0)} size={20} color={deal.ownerColor} />
          <span className="text-[11px] text-slate-500">{deal.owner}</span>
        </div>
        <span className="truncate text-[10px] text-slate-400">{deal.lastActivity}</span>
      </div>
    </article>
  )
}

function DealTableGroup({
  stage,
  deals,
  total,
  onOpen,
  onMove,
  onUpdate,
}: {
  stage: (typeof DEAL_STAGES)[number]
  deals: CrmDeal[]
  total: number
  onOpen: (id: string) => void
  onMove: (id: string, stage: DealStage) => void
  onUpdate: (id: string, patch: Partial<CrmDeal>) => void
}) {
  return (
    <>
      <tr>
        <td colSpan={9} className="px-0 pt-3 pb-0">
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: `${stage.statusColor}14` }}>
            <span className="h-6 w-1.5 rounded-full" style={{ background: stage.statusColor }} />
            <span className="rounded px-2 py-0.5 text-[12px] font-bold text-white" style={{ background: stage.statusColor }}>
              {stage.label}
            </span>
            <span className="text-[12px] font-semibold text-slate-500">
              {deals.length} · {formatMoney(total)}
            </span>
          </div>
        </td>
      </tr>
      {deals.map((deal) => (
        <tr key={deal.id} className="border-b border-slate-100 hover:bg-[#f8f9fc]" onClick={() => onOpen(deal.id)}>
          <td className="px-4 py-2.5">
            <div className="font-semibold text-ink">{deal.title}</div>
            <div className="text-[11px] text-muted">{deal.company} · {deal.contact}</div>
          </td>
          <td className="px-3 py-2.5"><SegBadge segment={deal.segment} /></td>
          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
            <select
              value={deal.stage}
              onChange={(e) => onMove(deal.id, e.target.value as DealStage)}
              className="rounded px-2 py-1 text-[11px] font-bold text-white outline-none"
              style={{ background: stageMeta(deal.stage).statusColor }}
            >
              {DEAL_STAGES.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-ink">{s.label}</option>
              ))}
            </select>
          </td>
          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
            <select
              value={deal.owner}
              onChange={(e) => onUpdate(deal.id, { owner: e.target.value })}
              className="rounded border border-slate-200 px-1.5 py-1 text-[12px] outline-none"
            >
              <option value="Joy">Joy</option>
              <option value="Freya">Freya</option>
            </select>
          </td>
          <td className="px-3 py-2.5 font-bold">{formatMoney(deal.value)}</td>
          <td className="px-3 py-2.5 text-slate-600">{deal.product}</td>
          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="date"
              value={deal.closeDate}
              onChange={(e) => onUpdate(deal.id, { closeDate: e.target.value })}
              className={`rounded border px-2 py-1 text-[12px] outline-none ${
                isOverdue(deal) ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            />
          </td>
          <td className="px-3 py-2.5 font-semibold text-emerald-600">{formatMoney(forecastValue(deal))}</td>
          <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-500">{deal.nextStep}</td>
        </tr>
      ))}
    </>
  )
}

function ActivityRow({ activity, onToggle }: { activity: CrmActivity; onToggle: () => void }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm ${activity.done ? 'opacity-60' : 'border-slate-100'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
          activity.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
        }`}
      >
        {activity.done && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-ink">{activity.title}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
            {ACTIVITY_LABEL[activity.type]}
          </span>
          <SegBadge segment={activity.segment} />
          {activity.freyaDrafted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-soft px-2 py-0.5 text-[10px] font-bold text-sky-bright">
              <Sparkles className="h-3 w-3" /> Freya drafted
            </span>
          )}
        </div>
        <div className="text-[12px] text-muted">
          {activity.relatedLabel} · due {formatShortDate(activity.dueDate)} · {activity.owner}
        </div>
        {activity.notes && <p className="mt-1 text-[12px] text-slate-600">{activity.notes}</p>}
      </div>
    </div>
  )
}

function InsightCard({
  insight,
  compact,
  onDismiss,
  onAction,
}: {
  insight: FreyaInsight
  compact?: boolean
  onDismiss?: () => void
  onAction?: () => void
}) {
  const tone =
    insight.tone === 'risk'
      ? 'border-rose-200/60 bg-gradient-to-br from-rose-50 via-white to-peach/30 shadow-sm shadow-rose-200/20'
      : insight.tone === 'win'
        ? 'border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-mint/30 shadow-sm shadow-emerald-200/20'
        : insight.tone === 'action'
          ? 'border-sky/30 bg-gradient-to-br from-sky-soft/70 via-white to-violet-50/40 shadow-sm shadow-sky/15'
          : 'border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-sky-soft/30'
  const iconTone =
    insight.tone === 'risk'
      ? 'bg-gradient-to-br from-rose-500 to-coral text-white'
      : insight.tone === 'win'
        ? 'bg-gradient-to-br from-emerald-500 to-mint text-white'
        : 'bg-gradient-to-br from-sky-bright to-violet-500 text-white'
  const Icon =
    insight.tone === 'risk' ? AlertTriangle : insight.tone === 'win' ? CheckCircle2 : Sparkles
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="mb-2 flex items-start gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink">{insight.title}</div>
          <p className={`mt-1 text-[13px] leading-relaxed text-slate-600 ${compact ? 'line-clamp-2' : ''}`}>
            {insight.body}
          </p>
        </div>
        {insight.segment !== 'both' && <SegBadge segment={insight.segment} />}
      </div>
      <div className="flex gap-2">
        {onAction && (
          <button type="button" onClick={onAction} className="rounded-full bg-gradient-to-r from-navy-mid to-sky-bright px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
            {insight.actionLabel}
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-500">
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

function AddContactModal({
  onClose,
  onAdd,
  defaultSegment,
}: {
  onClose: () => void
  defaultSegment: CrmSegment
  onAdd: (input: { name: string; email: string; phone?: string; segment: CrmSegment; companyName?: string; notes?: string }) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [leaveToFreya, setLeaveToFreya] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [segment, setSegment] = useState<CrmSegment>(defaultSegment)
  const [notes, setNotes] = useState('')
  const [applying, setApplying] = useState(false)

  function applySemiAuto() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillContact(prompt, segment)
      setName(filled.name)
      setEmail(filled.email)
      setPhone(filled.phone || '')
      setCompanyName(filled.companyName || '')
      setNotes(filled.notes || '')
      setSegment(filled.segment)
      setApplying(false)
    }, 550)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const filled = leaveToFreya ? freyaFillContact(prompt, segment) : null
    const contactName = (filled?.name || name).trim()
    if (!contactName) return
    onAdd({
      name: contactName,
      email: email || filled?.email || `${contactName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: phone || filled?.phone,
      segment: filled?.segment || segment,
      companyName: companyName || filled?.companyName,
      notes: notes || filled?.notes,
    })
    onClose()
  }

  const canSubmit = leaveToFreya || name.trim().length > 0

  return (
    <ModalShell title="Add contact" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <FreyaCreationAssist
          prompt={prompt}
          onPromptChange={setPrompt}
          leaveToFreya={leaveToFreya}
          onLeaveToFreyaChange={setLeaveToFreya}
          onApplyPrompt={applySemiAuto}
          applying={applying}
          disabled={applying}
          applyLabel="Freya, fill contact from prompt"
          placeholder="e.g. Event planner Sarah — corporate catering lead from LinkedIn"
        />
        {leaveToFreya ? (
          <p className="rounded-lg bg-sky-soft/50 px-3 py-2.5 text-[12px] text-muted">
            Full auto — Freya adds the contact from your prompt.
          </p>
        ) : (
          <>
            <SegToggle value={segment} onChange={setSegment} />
            <FieldInput label="Full name" value={name} onChange={setName} required />
            <FieldInput label="Email" value={email} onChange={setEmail} />
            <FieldInput label="Phone" value={phone} onChange={setPhone} />
            {segment === 'b2b' && <FieldInput label="Company" value={companyName} onChange={setCompanyName} />}
            <FieldInput label="Notes" value={notes} onChange={setNotes} />
          </>
        )}
        <button type="submit" disabled={!canSubmit || applying} className="h-11 w-full rounded-lg bg-sky font-bold text-white disabled:bg-sky-muted">
          {leaveToFreya ? 'Let Freya add contact' : 'Save contact'}
        </button>
      </form>
    </ModalShell>
  )
}

function AddCompanyModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (input: { name: string; domain?: string; industry?: string; segment?: CrmSegment; notes?: string }) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [leaveToFreya, setLeaveToFreya] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [industry, setIndustry] = useState('Other')
  const [notes, setNotes] = useState('')
  const [applying, setApplying] = useState(false)

  function applySemiAuto() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillCompany(prompt)
      setName(filled.name)
      setDomain(filled.domain || '')
      setIndustry(filled.industry || 'Other')
      setNotes(filled.notes || '')
      setApplying(false)
    }, 550)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const filled = leaveToFreya ? freyaFillCompany(prompt) : null
    const company = (filled?.name || name).trim()
    if (!company) return
    onAdd({
      name: company,
      domain: domain || filled?.domain,
      industry: industry || filled?.industry,
      segment: 'b2b',
      notes: notes || filled?.notes,
    })
    onClose()
  }

  const canSubmit = leaveToFreya || name.trim().length > 0

  return (
    <ModalShell title="Add company" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <FreyaCreationAssist
          prompt={prompt}
          onPromptChange={setPrompt}
          leaveToFreya={leaveToFreya}
          onLeaveToFreyaChange={setLeaveToFreya}
          onApplyPrompt={applySemiAuto}
          applying={applying}
          disabled={applying}
          applyLabel="Freya, fill company from prompt"
          placeholder="e.g. Local office park — potential weekly catering account"
        />
        {leaveToFreya ? (
          <p className="rounded-lg bg-sky-soft/50 px-3 py-2.5 text-[12px] text-muted">
            Full auto — Freya adds the company from your prompt.
          </p>
        ) : (
          <>
            <FieldInput label="Company name" value={name} onChange={setName} required />
            <FieldInput label="Domain" value={domain} onChange={setDomain} />
            <FieldInput label="Industry" value={industry} onChange={setIndustry} />
            <FieldInput label="Notes" value={notes} onChange={setNotes} />
          </>
        )}
        <button type="submit" disabled={!canSubmit || applying} className="h-11 w-full rounded-lg bg-sky font-bold text-white disabled:bg-sky-muted">
          {leaveToFreya ? 'Let Freya add company' : 'Save company'}
        </button>
      </form>
    </ModalShell>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-ink" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-ink">{label}</label>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
      />
    </div>
  )
}

function SegToggle({ value, onChange }: { value: CrmSegment; onChange: (v: CrmSegment) => void }) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 p-0.5">
      {(['b2b', 'b2c'] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded px-3 py-1.5 text-[12px] font-bold ${value === s ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
        >
          {SEGMENT_LABEL[s]}
        </button>
      ))}
    </div>
  )
}

function SegBadge({ segment }: { segment: CrmSegment }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
        segment === 'b2b'
          ? 'bg-gradient-to-r from-sky-bright to-violet-500 text-white'
          : 'bg-gradient-to-r from-rose-400 to-coral text-white'
      }`}
    >
      {SEGMENT_LABEL[segment]}
    </span>
  )
}

function DetailLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-lg border border-slate-100 px-2.5 py-2">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase">{label}</div>
        <div className="text-[13px] font-medium text-ink">{value}</div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  sub: string
  icon: typeof Wallet
  tone: 'sky' | 'violet' | 'green' | 'orange'
}) {
  const tones = {
    sky: { gradient: 'from-sky-bright to-cyan-400', shadow: 'shadow-sky/30' },
    violet: { gradient: 'from-violet-500 to-fuchsia-400', shadow: 'shadow-violet-300/35' },
    green: { gradient: 'from-emerald-500 to-mint', shadow: 'shadow-emerald-300/35' },
    orange: { gradient: 'from-orange-500 to-peach', shadow: 'shadow-orange-300/35' },
  }
  const t = tones[tone]
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.gradient} p-4 text-white shadow-md ${t.shadow}`}
    >
      <Icon className="absolute -right-1 -bottom-1 h-14 w-14 opacity-20" />
      <div className="relative mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
        <Icon className="h-4 w-4" />
      </div>
      <div className="relative text-[11px] font-semibold tracking-wide text-white/80 uppercase">
        {label}
      </div>
      <div className="relative text-[22px] font-bold">{value}</div>
      <div className="relative text-[12px] text-white/75">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-sky/15 bg-gradient-to-br from-white via-sky-soft/30 to-violet-50/40 px-4 py-3 shadow-sm shadow-sky/10">
      <div className="text-[11px] font-semibold text-sky-bright uppercase">{label}</div>
      <div className="bg-gradient-to-r from-sky-bright to-violet-500 bg-clip-text text-[18px] font-bold text-transparent">
        {value}
      </div>
    </div>
  )
}
