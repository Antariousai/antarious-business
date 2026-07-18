import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AVATAR_PALETTE,
  SEED_LEADS,
  type Lead,
  type LeadStage,
  type LeadTemp,
} from '../data/leadsData'

const STORAGE_KEY = 'antarious-leads-v1'

interface StoredLeads {
  leads: Lead[]
}

function load(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(SEED_LEADS)
    const parsed = JSON.parse(raw) as StoredLeads | Lead[]
    if (Array.isArray(parsed)) return parsed.length ? parsed : structuredClone(SEED_LEADS)
    return parsed.leads?.length ? parsed.leads : structuredClone(SEED_LEADS)
  } catch {
    return structuredClone(SEED_LEADS)
  }
}

function save(leads: Lead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ leads }))
}

export interface AddLeadInput {
  name: string
  email: string
  company?: string
  note?: string
  tags?: string[]
  temp?: LeadTemp
  source?: Lead['source']
}

interface LeadsContextValue {
  leads: Lead[]
  selectedIds: Set<string>
  toggleSelect: (id: string) => void
  clearSelection: () => void
  moveLead: (id: string, stage: LeadStage) => void
  moveSelected: (stage: LeadStage) => void
  addLead: (input: AddLeadInput) => Lead
  updateLead: (id: string, patch: Partial<Lead>) => void
  removeLeads: (ids: string[]) => void
}

const LeadsContext = createContext<LeadsContextValue | null>(null)

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(() => load())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const persist = useCallback((nextLeads: Lead[]) => {
    setLeads(nextLeads)
    save(nextLeads)
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const moveLead = useCallback(
    (id: string, stage: LeadStage) => {
      persist(leads.map((l) => (l.id === id ? { ...l, stage } : l)))
    },
    [leads, persist],
  )

  const moveSelected = useCallback(
    (stage: LeadStage) => {
      if (!selectedIds.size) return
      persist(leads.map((l) => (selectedIds.has(l.id) ? { ...l, stage } : l)))
      clearSelection()
    },
    [selectedIds, leads, persist, clearSelection],
  )

  const addLead = useCallback(
    (input: AddLeadInput) => {
      const lead: Lead = {
        id: `l${Date.now()}`,
        name: input.name.trim(),
        email: input.email.trim(),
        company: (input.company || '').trim() || '—',
        note: (input.note || '').trim() || 'Manually added — Freya will draft a hello.',
        stage: 'new',
        temp: input.temp || 'warm',
        source: input.source || 'manual',
        platform: 'other',
        tags: input.tags?.length ? input.tags : ['Local'],
        color: AVATAR_PALETTE[leads.length % AVATAR_PALETTE.length],
        createdAt: new Date().toISOString().slice(0, 10),
      }
      persist([lead, ...leads])
      return lead
    },
    [leads, persist],
  )

  const updateLead = useCallback(
    (id: string, patch: Partial<Lead>) => {
      persist(leads.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    },
    [leads, persist],
  )

  const removeLeads = useCallback(
    (ids: string[]) => {
      const set = new Set(ids)
      persist(leads.filter((l) => !set.has(l.id)))
      clearSelection()
    },
    [leads, persist, clearSelection],
  )

  const value = useMemo(
    () => ({
      leads,
      selectedIds,
      toggleSelect,
      clearSelection,
      moveLead,
      moveSelected,
      addLead,
      updateLead,
      removeLeads,
    }),
    [
      leads,
      selectedIds,
      toggleSelect,
      clearSelection,
      moveLead,
      moveSelected,
      addLead,
      updateLead,
      removeLeads,
    ],
  )

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
}

export function useLeads() {
  const ctx = useContext(LeadsContext)
  if (!ctx) throw new Error('useLeads must be used within LeadsProvider')
  return ctx
}
