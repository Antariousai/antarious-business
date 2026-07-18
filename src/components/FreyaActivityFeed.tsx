import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Activity,
  Check,
  CheckCircle2,
  Clock,
  FilePenLine,
  LayoutTemplate,
  Megaphone,
  MessageSquare,
  Radar,
  Sparkles,
  Telescope,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useFreyaActivity, type ActivityFilter } from '../context/FreyaActivityContext'
import {
  AREA_LABEL,
  type FreyaActivityArea,
  type FreyaActivityItem,
  type FreyaActivityStatus,
} from '../data/freyaActivityData'

const AREA_ICON: Record<FreyaActivityArea, typeof Activity> = {
  content: FilePenLine,
  leads: Users,
  inbox: MessageSquare,
  campaigns: Megaphone,
  money: Wallet,
  discover: Radar,
  crm: Telescope,
  templates: LayoutTemplate,
}

const STATUS_META: Record<FreyaActivityStatus, { label: string; className: string }> = {
  waiting: { label: 'Waiting for you', className: 'bg-amber-100 text-amber-800' },
  done: { label: 'Done', className: 'bg-emerald-100 text-emerald-700' },
  working: { label: 'Working', className: 'bg-sky-soft text-sky-bright' },
}

/** Compact activity feed for the Freya panel */
export function FreyaActivityFeed({ onNavigated }: { onNavigated?: () => void }) {
  const {
    filtered,
    filter,
    setFilter,
    waitingCount,
    workingCount,
    doneCount,
    approve,
    dismiss,
  } = useFreyaActivity()
  const [dropActive, setDropActive] = useState(false)

  const filters: { id: ActivityFilter; label: string; count?: number }[] = [
    { id: 'everything', label: 'Everything' },
    { id: 'waiting', label: 'Waiting', count: waitingCount },
    { id: 'working', label: 'Working', count: workingCount },
    { id: 'done', label: 'Done', count: doneCount },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-100 px-4 pt-3 pb-3">
        <div className="mb-1 flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky" />
          <h3 className="text-[15px] font-bold text-ink">What Freya&apos;s doing</h3>
        </div>
        <p className="text-[12px] leading-relaxed text-muted">
          Full transparency — nothing big ships without your OK.
        </p>
        {waitingCount > 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDropActive(true)
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/activity-id')
              if (id) approve(id)
              setDropActive(false)
            }}
            className={`mt-3 rounded-xl border border-dashed px-3 py-2.5 text-center text-[11px] font-bold transition ${
              dropActive
                ? 'border-sky bg-sky text-white'
                : 'border-sky/40 bg-sky-soft/50 text-sky-bright'
            }`}
          >
            Drag a waiting item here to approve
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                filter === f.id
                  ? 'bg-sky text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
              {f.count != null && f.count > 0 && (
                <span
                  className={`rounded-full px-1 text-[10px] ${
                    filter === f.id ? 'bg-white/25' : 'bg-white text-slate-500'
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {filtered.map((item) => (
          <ActivityCard
            key={item.id}
            item={item}
            onApprove={() => approve(item.id)}
            onDismiss={() => dismiss(item.id)}
            onNavigated={onNavigated}
          />
        ))}
        {!filtered.length && (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-400" />
            <p className="text-[13px] font-semibold text-ink">Nothing here</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {filter === 'waiting' ? 'You’re caught up.' : 'Freya will log the next move.'}
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-sky-soft/40 px-4 py-2.5 text-[11.5px] leading-relaxed text-muted">
        <span className="font-bold text-sky-bright">
          <Sparkles className="mr-1 inline h-3 w-3" />
          Tip
        </span>{' '}
        Approve waiting items here, or open the related module to review first.
      </div>
    </div>
  )
}

function ActivityCard({
  item,
  onApprove,
  onDismiss,
  onNavigated,
}: {
  item: FreyaActivityItem
  onApprove: () => void
  onDismiss: () => void
  onNavigated?: () => void
}) {
  const Icon = AREA_ICON[item.area]
  const status = STATUS_META[item.status]

  return (
    <article
      draggable={item.status === 'waiting'}
      onDragStart={(e) => {
        if (item.status !== 'waiting') return
        e.dataTransfer.setData('text/activity-id', item.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`rounded-xl border border-slate-100 bg-white p-3 shadow-sm ${
        item.status === 'waiting' ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <div className="flex gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            item.status === 'waiting'
              ? 'bg-amber-50 text-amber-600'
              : item.status === 'working'
                ? 'bg-sky-soft text-sky'
                : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-1.5">
            <h4 className="min-w-0 flex-1 text-[13px] leading-snug font-bold text-ink">
              {item.title}
            </h4>
            {item.storyId && (
              <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                Story {item.storyStep}/4
              </span>
            )}
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-muted">{item.detail}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500">{AREA_LABEL[item.area]}</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {item.time}
            </span>
          </div>
          {(item.status === 'waiting' || item.href) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.status === 'waiting' && (
                <>
                  <button
                    type="button"
                    onClick={onApprove}
                    className="inline-flex items-center gap-1 rounded-full bg-sky px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-bright"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                    Approve
                  </button>
                  {item.href && (
                    <Link
                      to={item.href}
                      onClick={onNavigated}
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      {item.actionLabel || 'Open'}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                    Dismiss
                  </button>
                </>
              )}
              {item.status !== 'waiting' && item.href && (
                <Link
                  to={item.href}
                  onClick={onNavigated}
                  className="text-[11px] font-bold text-sky hover:text-sky-bright"
                >
                  Open {AREA_LABEL[item.area]} →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
