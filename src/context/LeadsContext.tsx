import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { apiFetch } from '@/lib/backend/api'
import { mapApiLead } from '@/lib/backend/mappers'
import { useBackendMode } from '@/lib/backend/BackendModeContext'
import { hasSupabaseEnv } from '@/lib/backend/mode'

const STORAGE_KEY = 'antarious-leads-v2-bd'

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
  addLead: (input: AddLeadInput) => Lead | Promise<Lead>
  updateLead: (id: string, patch: Partial<Lead>) => void | Promise<void>
  removeLeads: (ids: string[]) => void | Promise<void>
  refresh: () => Promise<void>
}

const LeadsContext = createContext<LeadsContextValue | null>(null)

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { backend, ready } = useBackendMode()
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!backend) return
    const data = await apiFetch<{ leads: Parameters<typeof mapApiLead>[0][] }>('/api/leads')
    setLeads((data.leads ?? []).map((row, i) => mapApiLead(row, i)))
  }, [backend])

  useEffect(() => {
    if (!ready) return
    if (!backend) {
      if (hasSupabaseEnv()) {
        setLeads([])
        return
      }
      setLeads(load())
      return
    }
    let cancelled = false
    void refresh().catch(() => {
      if (!cancelled) setLeads([])
    })
    return () => {
      cancelled = true
    }
  }, [backend, ready, refresh])

  const persist = useCallback(
    (nextLeads: Lead[]) => {
      setLeads(nextLeads)
      if (!backend) save(nextLeads)
    },
    [backend],
  )

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
      if (backend) {
        void apiFetch('/api/leads', {
          method: 'PATCH',
          body: JSON.stringify({ id, stage }),
        }).then(() => refresh())
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)))
        return
      }
      persist(leads.map((l) => (l.id === id ? { ...l, stage } : l)))
    },
    [backend, leads, persist, refresh],
  )

  const moveSelected = useCallback(
    (stage: LeadStage) => {
      if (!selectedIds.size) return
      if (backend) {
        const ids = [...selectedIds]
        void Promise.all(
          ids.map((id) =>
            apiFetch('/api/leads', {
              method: 'PATCH',
              body: JSON.stringify({ id, stage }),
            }),
          ),
        ).then(() => refresh())
        setLeads((prev) => prev.map((l) => (selectedIds.has(l.id) ? { ...l, stage } : l)))
        clearSelection()
        return
      }
      persist(leads.map((l) => (selectedIds.has(l.id) ? { ...l, stage } : l)))
      clearSelection()
    },
    [backend, selectedIds, leads, persist, clearSelection, refresh],
  )

  const addLead = useCallback(
    async (input: AddLeadInput): Promise<Lead> => {
      if (backend) {
        const data = await apiFetch<{ lead: Parameters<typeof mapApiLead>[0] }>('/api/leads', {
          method: 'POST',
          body: JSON.stringify({
            name: input.name.trim(),
            email: input.email.trim() || null,
            company: (input.company || '').trim() || null,
            notes: (input.note || '').trim() || null,
            temperature: input.temp || 'warm',
            source: input.source || 'manual',
            stage: 'new',
            tags: input.tags?.length ? input.tags : ['Local'],
          }),
        })
        const lead = mapApiLead(
          {
            ...data.lead,
            lead_tags: (input.tags?.length ? input.tags : ['Local']).map((tag) => ({ tag })),
          },
          leads.length,
        )
        setLeads((prev) => [lead, ...prev])
        return lead
      }

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
    [backend, leads, persist],
  )

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>) => {
      if (backend) {
        const body: Record<string, unknown> = { id }
        if (patch.name != null) body.name = patch.name
        if (patch.company != null) body.company = patch.company
        if (patch.email != null) body.email = patch.email
        if (patch.note != null) body.notes = patch.note
        if (patch.stage != null) body.stage = patch.stage
        if (patch.temp != null) body.temperature = patch.temp
        if (patch.source != null) body.source = patch.source
        await apiFetch('/api/leads', { method: 'PATCH', body: JSON.stringify(body) })
        await refresh()
        return
      }
      persist(leads.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    },
    [backend, leads, persist, refresh],
  )

  const removeLeads = useCallback(
    async (ids: string[]) => {
      const set = new Set(ids)
      if (backend) {
        await Promise.all(
          ids.map((id) =>
            apiFetch(`/api/leads?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
          ),
        )
        setLeads((prev) => prev.filter((l) => !set.has(l.id)))
        clearSelection()
        return
      }
      persist(leads.filter((l) => !set.has(l.id)))
      clearSelection()
    },
    [backend, leads, persist, clearSelection],
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
      refresh,
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
      refresh,
    ],
  )

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
}

export function useLeads() {
  const ctx = useContext(LeadsContext)
  if (!ctx) throw new Error('useLeads must be used within LeadsProvider')
  return ctx
}
