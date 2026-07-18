import { useRef } from 'react'
import { ChevronDown, Mail, Pencil, Flame, Sun, Snowflake } from 'lucide-react'
import { Avatar } from './Avatar'
import { LEAD_STAGES, LEAD_TAG_COLORS, type Lead } from '../data/leadsData'
import { useLeads } from '../context/LeadsContext'

function TempIcon({ temp }: { temp: Lead['temp'] }) {
  if (temp === 'hot') return <Flame className="h-3.5 w-3.5 text-red-500" fill="currentColor" />
  if (temp === 'warm') return <Sun className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />
  return <Snowflake className="h-3.5 w-3.5 text-sky-400" />
}

function tempLabel(temp: Lead['temp']) {
  return temp.charAt(0).toUpperCase() + temp.slice(1)
}

function sourceLabel(source: Lead['source']) {
  if (source === 'freya-found') return 'Freya found'
  return source.charAt(0).toUpperCase() + source.slice(1)
}

function LeadDetails({
  lead,
  onEdit,
  compact,
}: {
  lead: Lead
  onEdit: () => void
  compact?: boolean
}) {
  const stage = LEAD_STAGES.find((s) => s.id === lead.stage)

  return (
    <div
      className={`space-y-3 border-t border-slate-100 ${compact ? 'mt-3 pt-3' : 'mt-3.5 pt-3.5'}`}
    >
      <p className="text-[13px] leading-relaxed text-slate-600">{lead.note}</p>

      <dl className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Email</dt>
          <dd className="mt-0.5 truncate text-[12.5px] font-semibold text-ink">{lead.email}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Company</dt>
          <dd className="mt-0.5 truncate text-[12.5px] font-semibold text-ink">{lead.company}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Source</dt>
          <dd className="mt-0.5 text-[12.5px] font-semibold text-ink">{sourceLabel(lead.source)}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Platform</dt>
          <dd className="mt-0.5 text-[12.5px] font-semibold capitalize text-ink">{lead.platform}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Stage</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: stage?.color || '#94a3b8' }}
            />
            {stage?.label || lead.stage}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Temp</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <TempIcon temp={lead.temp} />
            {tempLabel(lead.temp)}
          </dd>
        </div>
      </dl>

      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lead.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                LEAD_TAG_COLORS[tag] || 'bg-slate-100 text-slate-600'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <a
          href={`mailto:${lead.email}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </a>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-sky px-3 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-sky/30 hover:brightness-110 sm:flex-none"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
    </div>
  )
}

export function LeadKanbanCard({
  lead,
  dragging,
  expanded,
  onToggleExpand,
  onEdit,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead
  dragging?: boolean
  expanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
}) {
  const { selectedIds, toggleSelect, updateLead, moveLead } = useLeads()
  const selected = selectedIds.has(lead.id)
  const draggedRef = useRef(false)

  return (
    <article
      draggable
      onDragStart={(e) => {
        draggedRef.current = true
        e.dataTransfer.setData('text/plain', lead.id)
        e.dataTransfer.setData('text/lead-id', lead.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(lead.id)
      }}
      onDragEnd={() => {
        onDragEnd()
      }}
      onClick={() => {
        if (draggedRef.current) {
          draggedRef.current = false
          return
        }
        onToggleExpand()
      }}
      className={`cursor-grab touch-none rounded-2xl border bg-white p-3.5 shadow-sm select-none transition active:cursor-grabbing ${
        dragging
          ? 'scale-[0.98] opacity-40 ring-2 ring-sky'
          : expanded
            ? 'border-sky ring-2 ring-sky/25 shadow-md'
            : selected
              ? 'border-sky ring-2 ring-sky/30'
              : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
      }`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar letter={lead.name.charAt(0)} size={36} color={lead.color} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-ink">{lead.name}</div>
            <div className="truncate text-[11.5px] text-muted">{lead.company}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <TempIcon temp={lead.temp} />
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition ${expanded ? 'rotate-180 text-sky-bright' : ''}`}
          />
          <button
            type="button"
            draggable={false}
            aria-label={selected ? 'Deselect lead' : 'Select lead'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              toggleSelect(lead.id)
            }}
            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
              selected ? 'border-sky bg-sky' : 'border-slate-300 bg-white'
            }`}
          >
            {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </button>
        </div>
      </div>

      {!expanded && (
        <>
          <p className="mb-3 line-clamp-2 text-[12.5px] leading-snug text-slate-600">{lead.note}</p>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                  LEAD_TAG_COLORS[tag] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </>
      )}

      {expanded && <LeadDetails lead={lead} onEdit={onEdit} compact />}

      {lead.stage === 'new' && !expanded && (
        <button
          type="button"
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            updateLead(lead.id, {
              note: `Freya drafted a hello to ${lead.name.split(' ')[0]} — warm intro about ${lead.company}.`,
              temp: 'hot',
            })
            moveLead(lead.id, 'contacted')
          }}
          className="w-full rounded-full bg-sky-soft px-2.5 py-1.5 text-[11px] font-bold text-sky-bright hover:bg-sky hover:text-white"
        >
          Freya: draft hello
        </button>
      )}
    </article>
  )
}

export function LeadContactRow({
  lead,
  expanded,
  onToggleExpand,
  onEdit,
}: {
  lead: Lead
  expanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
}) {
  const { moveLead } = useLeads()
  const stageLabel = lead.stage.charAt(0).toUpperCase() + lead.stage.slice(1)

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition ${
        expanded
          ? 'border-sky/40 shadow-md ring-2 ring-sky/15'
          : 'border-slate-100 hover:border-sky/25 hover:shadow-md'
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full flex-wrap items-center gap-4 px-4 py-3.5 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar letter={lead.name.charAt(0)} size={42} color={lead.color} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-ink">{lead.name}</div>
            <div className="truncate text-[12px] text-muted">
              {lead.company}
              <span className="mx-1.5 text-slate-300">·</span>
              {sourceLabel(lead.source)}
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="capitalize">{lead.platform}</span>
            </div>
            {!expanded && lead.note && (
              <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">{lead.note}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!expanded &&
            lead.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  LEAD_TAG_COLORS[tag] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {tag}
              </span>
            ))}
          <TempIcon temp={lead.temp} />
          <select
            value={lead.stage}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              moveLead(lead.id, e.target.value as Lead['stage'])
            }}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-ink outline-none"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
          </select>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition ${expanded ? 'rotate-180 text-sky-bright' : ''}`}
          />
          <span className="sr-only">{stageLabel}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <LeadDetails lead={lead} onEdit={onEdit} />
        </div>
      )}
    </div>
  )
}
