import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, List, Plus, Trash2, ArrowRight, Users, Sparkles, Pencil } from 'lucide-react'
import { AddLeadModal, EditLeadModal } from '../components/AddLeadModal'
import { AddFunnelStep } from '../components/AddFunnelStep'
import { PageHero } from '../components/PageHero'
import { LeadContactRow, LeadKanbanCard } from '../components/LeadCards'
import { useLeads } from '../context/LeadsContext'
import { useFunnelStages } from '../context/FunnelStagesContext'
import { stageColumnChrome } from '../data/funnelStages'
import type { Lead, LeadStage } from '../data/leadsData'

type Tab = 'board' | 'contacts'

export function LeadsPage() {
  const { leads, selectedIds, moveLead, moveSelected, clearSelection, removeLeads } = useLeads()
  const { leadStages, addStage } = useFunnelStages()
  const [tab, setTab] = useState<Tab>('board')
  const [showAdd, setShowAdd] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<LeadStage | null>(null)
  const [pickToEdit, setPickToEdit] = useState(false)

  const hotCount = leads.filter((l) => l.temp === 'hot').length

  function toggleExpand(id: string) {
    setExpandedLeadId((cur) => (cur === id ? null : id))
  }

  function startEditContacts() {
    setTab('contacts')
    setExpandedLeadId(null)
    if (leads.length === 1) {
      setEditingLead(leads[0])
      setPickToEdit(false)
      return
    }
    setPickToEdit(true)
  }

  function onContactActivate(lead: Lead) {
    if (pickToEdit) {
      setEditingLead(lead)
      setPickToEdit(false)
      return
    }
    toggleExpand(lead.id)
  }

  return (
    <div className="px-8 pt-6 pb-24">
      <PageHero
        accent="mint"
        title="Interested people"
        subtitle={
          <>
            Freya finds people who might buy, watches what they do, and helps you follow up. New ideas live in{' '}
            <Link to="/app/discover" className="font-bold text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
              Ideas
            </Link>
            .
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startEditContacts}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-4 py-2.5 text-[14px] font-bold text-white hover:bg-white/25"
            >
              <Pencil className="h-4 w-4" strokeWidth={2.5} />
              Edit contacts
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Add person
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-bold text-ink shadow-sm ring-1 ring-sky/15">
            <Users className="h-3.5 w-3.5 text-sky" />
            {leads.length} people
          </span>
          {hotCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-coral/15 to-rose-100 px-3 py-1.5 text-[12px] font-bold text-rose-600 ring-1 ring-coral/25">
              <Sparkles className="h-3.5 w-3.5" />
              {hotCount} hot
            </span>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-emerald-100">
          {(
            [
              { id: 'board', label: 'Board', icon: LayoutGrid },
              { id: 'contacts', label: 'Contacts', icon: List },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id)
                setExpandedLeadId(null)
                if (t.id !== 'contacts') setPickToEdit(false)
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                tab === t.id
                  ? 'bg-gradient-to-r from-mint to-sky-bright text-white shadow-sm shadow-emerald-300/40'
                  : 'text-slate-500 hover:text-ink'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-sky/25 bg-gradient-to-r from-white via-sky-soft/30 to-white px-3 py-1.5 shadow-md shadow-sky/10 ring-1 ring-sky/15">
            <span className="rounded-full bg-navy-deep px-2 py-0.5 text-[11px] font-bold text-white">
              {selectedIds.size} selected
            </span>
            {leadStages.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => moveSelected(s.key)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm"
                style={{ background: s.color }}
              >
                <ArrowRight className="h-3 w-3" />
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => removeLeads([...selectedIds])}
              className="inline-flex items-center gap-1 rounded-full bg-coral/15 px-2.5 py-1 text-[11px] font-bold text-coral ring-1 ring-coral/30"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="text-[11px] font-semibold text-muted"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {tab === 'board' && (
        <div className="kanban-board flex items-stretch gap-3 overflow-x-auto pb-2">
          {leadStages.map((stage, index) => {
            const columnLeads = leads.filter((l) => l.stage === stage.key)
            const col = stageColumnChrome(index)
            const isOver = overStage === stage.key
            return (
              <section
                key={stage.key}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (overStage !== stage.key) setOverStage(stage.key)
                }}
                onDragLeave={(e) => {
                  const next = e.relatedTarget as Node | null
                  if (next && e.currentTarget.contains(next)) return
                  setOverStage((cur) => (cur === stage.key ? null : cur))
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const id =
                    e.dataTransfer.getData('text/lead-id') ||
                    e.dataTransfer.getData('text/plain') ||
                    draggingId
                  if (id) moveLead(id, stage.key)
                  setDraggingId(null)
                  setOverStage(null)
                }}
                className={`flex w-[280px] min-w-[260px] shrink-0 flex-col rounded-2xl border border-white/60 shadow-sm transition ${
                  isOver ? col.over : col.bg
                }`}
              >
                <header
                  className={`flex shrink-0 items-center gap-2 rounded-t-2xl bg-gradient-to-r px-3 py-3 ${col.header}`}
                >
                  <span
                    className="h-3 w-3 rounded-full shadow-sm ring-2 ring-white/80"
                    style={{ background: stage.color }}
                  />
                  <h3 className="text-[13px] font-bold text-ink">{stage.label}</h3>
                  <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${col.count}`}>
                    {columnLeads.length}
                  </span>
                </header>
                <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-3 pt-1">
                  {columnLeads.map((lead) => (
                    <LeadKanbanCard
                      key={lead.id}
                      lead={lead}
                      dragging={draggingId === lead.id}
                      expanded={expandedLeadId === lead.id}
                      onToggleExpand={() => toggleExpand(lead.id)}
                      onEdit={() => setEditingLead(lead)}
                      onDragStart={setDraggingId}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setOverStage(null)
                      }}
                    />
                  ))}
                  <div
                    className={`mt-auto rounded-2xl border border-dashed px-3 py-6 text-center text-[12px] transition ${
                      isOver
                        ? 'border-sky bg-white/80 font-bold text-sky-bright shadow-inner'
                        : columnLeads.length
                          ? 'border-transparent text-transparent'
                          : 'border-sky/25 bg-white/40 text-sky-bright/70'
                    }`}
                  >
                    {isOver ? 'Drop here' : 'Drop leads here'}
                  </div>
                </div>
              </section>
            )
          })}
          <AddFunnelStep
            placeholder="e.g. Visited shop"
            onAdd={(label) => addStage('leads', label)}
          />
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-2.5">
          {pickToEdit && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky/25 bg-sky-soft/60 px-4 py-2.5 text-[13px] text-sky-bright">
              <span className="font-semibold">Tap a person to edit their contact details.</span>
              <button
                type="button"
                onClick={() => setPickToEdit(false)}
                className="text-[12px] font-bold text-sky-bright/80 underline underline-offset-2 hover:text-sky-bright"
              >
                Cancel
              </button>
            </div>
          )}
          {leads.map((lead) => (
            <LeadContactRow
              key={lead.id}
              lead={lead}
              expanded={!pickToEdit && expandedLeadId === lead.id}
              highlightPick={pickToEdit}
              onToggleExpand={() => onContactActivate(lead)}
              onEdit={() => {
                setEditingLead(lead)
                setPickToEdit(false)
              }}
            />
          ))}
          {!leads.length && (
            <div className="overflow-hidden rounded-2xl border border-sky/20 bg-gradient-to-br from-sky-soft/60 via-white to-mint/10 p-12 text-center shadow-lg shadow-sky/10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky to-mint text-white shadow-md shadow-sky/30">
                <Users className="h-7 w-7" />
              </div>
              <p className="text-[15px] font-bold text-ink">No leads yet</p>
              <p className="mt-1 text-[13px] text-muted">Add one manually or pull ideas from Ideas.</p>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-2 text-[13px] font-bold text-white shadow-sm shadow-sky/30"
              >
                <Plus className="h-4 w-4" />
                Add your first lead
              </button>
            </div>
          )}
        </div>
      )}

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} />}
      {editingLead && (
        <EditLeadModal lead={editingLead} onClose={() => setEditingLead(null)} />
      )}
    </div>
  )
}
