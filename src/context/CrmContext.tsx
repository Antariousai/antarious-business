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
  DEAL_STAGES,
  SEED_ACTIVITIES,
  SEED_COMPANIES,
  SEED_CONTACTS,
  SEED_DEALS,
  SEED_INSIGHTS,
  normalizeStage,
  type CrmActivity,
  type CrmCompany,
  type CrmContact,
  type CrmDeal,
  type CrmSegment,
  type DealPriority,
  type DealStage,
  type FreyaInsight,
} from '../data/crmData'
import { apiFetch } from '@/lib/backend/api'
import {
  mapApiCrmActivity,
  mapApiCrmCompany,
  mapApiCrmContact,
  mapApiCrmDeal,
  mapApiCrmInsight,
} from '@/lib/backend/mappers'
import { useBackendMode } from '@/lib/backend/BackendModeContext'
import { useFunnelStages } from '@/context/FunnelStagesContext'

const STORAGE_KEY = 'antarious-crm-v2-bd'

interface StoredCrm {
  deals: CrmDeal[]
  contacts: CrmContact[]
  companies: CrmCompany[]
  activities: CrmActivity[]
  insights: FreyaInsight[]
}

function loadCrm(): StoredCrm {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        deals: structuredClone(SEED_DEALS),
        contacts: structuredClone(SEED_CONTACTS),
        companies: structuredClone(SEED_COMPANIES),
        activities: structuredClone(SEED_ACTIVITIES),
        insights: structuredClone(SEED_INSIGHTS),
      }
    }
    const parsed = JSON.parse(raw) as Partial<StoredCrm>
    return {
      deals: Array.isArray(parsed.deals) && parsed.deals.length
        ? parsed.deals.map((d) => ({ ...d, stage: normalizeStage(String(d.stage)) }))
        : structuredClone(SEED_DEALS),
      contacts: parsed.contacts?.length ? parsed.contacts : structuredClone(SEED_CONTACTS),
      companies: parsed.companies?.length ? parsed.companies : structuredClone(SEED_COMPANIES),
      activities: parsed.activities?.length ? parsed.activities : structuredClone(SEED_ACTIVITIES),
      insights: parsed.insights?.length ? parsed.insights : structuredClone(SEED_INSIGHTS),
    }
  } catch {
    return {
      deals: structuredClone(SEED_DEALS),
      contacts: structuredClone(SEED_CONTACTS),
      companies: structuredClone(SEED_COMPANIES),
      activities: structuredClone(SEED_ACTIVITIES),
      insights: structuredClone(SEED_INSIGHTS),
    }
  }
}

export interface AddDealInput {
  title: string
  company: string
  contact: string
  email?: string
  value: number
  stage?: DealStage
  priority?: DealPriority
  segment?: CrmSegment
  product?: string
  owner?: string
  closeDate?: string
  nextStep?: string
  note?: string
}

export interface AddContactInput {
  name: string
  email: string
  phone?: string
  segment: CrmSegment
  companyName?: string
  title?: string
  tags?: string[]
  notes?: string
}

export interface AddCompanyInput {
  name: string
  domain?: string
  industry?: string
  segment?: CrmSegment
  size?: string
  notes?: string
}

interface CrmContextValue {
  deals: CrmDeal[]
  contacts: CrmContact[]
  companies: CrmCompany[]
  activities: CrmActivity[]
  insights: FreyaInsight[]
  selectedDealId: string | null
  selectDeal: (id: string | null) => void
  moveDeal: (id: string, stage: DealStage) => void
  addDeal: (input: AddDealInput) => CrmDeal | Promise<CrmDeal>
  updateDeal: (id: string, patch: Partial<CrmDeal>) => void | Promise<void>
  removeDeal: (id: string) => void
  addContact: (input: AddContactInput) => CrmContact | Promise<CrmContact>
  updateContact: (id: string, patch: Partial<CrmContact>) => void
  addCompany: (input: AddCompanyInput) => CrmCompany | Promise<CrmCompany>
  updateCompany: (id: string, patch: Partial<CrmCompany>) => void
  toggleActivity: (id: string) => void
  addActivity: (partial: Omit<CrmActivity, 'id' | 'done'> & { done?: boolean }) => void
  dismissInsight: (id: string) => void
  refresh: () => Promise<void>
  totals: {
    openValue: number
    forecast: number
    won: number
    openCount: number
    b2bOpen: number
    b2cOpen: number
    contacts: number
    companies: number
    tasksDue: number
  }
}

const CrmContext = createContext<CrmContextValue | null>(null)

export function CrmProvider({ children }: { children: ReactNode }) {
  const { backend, ready } = useBackendMode()
  const { crmStageMeta } = useFunnelStages()
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [companies, setCompanies] = useState<CrmCompany[]>([])
  const [activities, setActivities] = useState<CrmActivity[]>([])
  const [insights, setInsights] = useState<FreyaInsight[]>([])
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!backend) return
    const data = await apiFetch<{
      deals: Parameters<typeof mapApiCrmDeal>[0][]
      contacts: Parameters<typeof mapApiCrmContact>[0][]
      companies: Parameters<typeof mapApiCrmCompany>[0][]
      activities: Parameters<typeof mapApiCrmActivity>[0][]
      insights: Parameters<typeof mapApiCrmInsight>[0][]
    }>('/api/crm?resource=all')

    const mappedCompanies = (data.companies ?? []).map(mapApiCrmCompany)
    const companyById = new Map(mappedCompanies.map((c) => [c.id, c]))
    const mappedContacts = (data.contacts ?? []).map((row) =>
      mapApiCrmContact(row, row.company_id ? companyById.get(row.company_id)?.name : undefined),
    )
    const mappedDeals = (data.deals ?? []).map((row) =>
      mapApiCrmDeal(row, { companies: mappedCompanies, contacts: mappedContacts }),
    )
    setCompanies(mappedCompanies)
    setContacts(mappedContacts)
    setDeals(mappedDeals)
    setActivities((data.activities ?? []).map(mapApiCrmActivity))
    setInsights((data.insights ?? []).map(mapApiCrmInsight))
  }, [backend])

  useEffect(() => {
    if (!ready) return
    if (!backend) {
      const initial = loadCrm()
      setDeals(initial.deals)
      setContacts(initial.contacts)
      setCompanies(initial.companies)
      setActivities(initial.activities)
      setInsights(initial.insights)
      return
    }
    let cancelled = false
    void refresh().catch(() => {
      if (!cancelled) {
        setDeals([])
        setContacts([])
        setCompanies([])
        setActivities([])
        setInsights([])
      }
    })
    return () => {
      cancelled = true
    }
  }, [backend, ready, refresh])

  const persist = useCallback(
    (next: Partial<StoredCrm>) => {
      const payload: StoredCrm = {
        deals: next.deals ?? deals,
        contacts: next.contacts ?? contacts,
        companies: next.companies ?? companies,
        activities: next.activities ?? activities,
        insights: next.insights ?? insights,
      }
      if (next.deals) setDeals(next.deals)
      if (next.contacts) setContacts(next.contacts)
      if (next.companies) setCompanies(next.companies)
      if (next.activities) setActivities(next.activities)
      if (next.insights) setInsights(next.insights)
      if (!backend) localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    },
    [backend, deals, contacts, companies, activities, insights],
  )

  const selectDeal = useCallback((id: string | null) => setSelectedDealId(id), [])

  const moveDeal = useCallback(
    (id: string, stage: DealStage) => {
      const meta = crmStageMeta(stage)
      if (backend) {
        void apiFetch('/api/crm', {
          method: 'PATCH',
          body: JSON.stringify({ resource: 'deals', id, stage }),
        }).then(() => refresh())
        setDeals((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, stage, lastActivity: `Moved to ${meta.label} · Just now` } : d,
          ),
        )
        return
      }
      persist({
        deals: deals.map((d) =>
          d.id === id ? { ...d, stage, lastActivity: `Moved to ${meta.label} · Just now` } : d,
        ),
      })
    },
    [backend, deals, persist, refresh, crmStageMeta],
  )

  const addDeal = useCallback(
    async (input: AddDealInput): Promise<CrmDeal> => {
      const stage = input.stage || 'qualified'
      const owner = input.owner || 'Joy'

      if (backend) {
        const data = await apiFetch<{ deal: Parameters<typeof mapApiCrmDeal>[0] }>('/api/crm', {
          method: 'POST',
          body: JSON.stringify({
            resource: 'deals',
            title: input.title.trim(),
            stage,
            valueBdt: Number(input.value) || 0,
            nextStep: input.nextStep || 'Send intro',
          }),
        })
        const deal = mapApiCrmDeal(data.deal, { companies, contacts })
        setDeals((prev) => [deal, ...prev])
        setSelectedDealId(deal.id)
        return deal
      }

      const deal: CrmDeal = {
        id: `d${Date.now()}`,
        title: input.title.trim(),
        companyId: null,
        company: input.company.trim() || '—',
        contactId: null,
        contact: input.contact.trim() || '—',
        email: (input.email || '').trim(),
        phone: '',
        value: Number(input.value) || 0,
        stage,
        priority: input.priority || 'medium',
        segment: input.segment || 'b2b',
        owner,
        ownerColor: owner === 'Freya' ? '#38bdf8' : '#64748b',
        closeDate:
          input.closeDate ||
          new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        source: 'Manual',
        product: input.product || 'Custom',
        lastActivity: 'Created · Just now',
        nextStep: input.nextStep || 'Send intro',
        note: input.note || 'New deal — Freya will help nurture this.',
        createdAt: new Date().toISOString().slice(0, 10),
        competitors: '—',
        decisionMaker: input.contact.trim() || '—',
      }
      persist({ deals: [deal, ...deals] })
      setSelectedDealId(deal.id)
      return deal
    },
    [backend, companies, contacts, deals, persist],
  )

  const updateDeal = useCallback(
    async (id: string, patch: Partial<CrmDeal>) => {
      if (backend) {
        const body: Record<string, unknown> = { resource: 'deals', id }
        if (patch.title != null) body.title = patch.title
        if (patch.stage != null) body.stage = patch.stage
        if (patch.value != null) body.valueBdt = patch.value
        if (patch.nextStep != null) body.nextStep = patch.nextStep
        await apiFetch('/api/crm', { method: 'PATCH', body: JSON.stringify(body) })
        await refresh()
        return
      }
      persist({
        deals: deals.map((d) => {
          if (d.id !== id) return d
          const next = { ...d, ...patch }
          if (patch.owner) next.ownerColor = patch.owner === 'Freya' ? '#38bdf8' : '#64748b'
          return next
        }),
      })
    },
    [backend, deals, persist, refresh],
  )

  const removeDeal = useCallback(
    (id: string) => {
      if (backend) {
        void apiFetch('/api/crm', {
          method: 'DELETE',
          body: JSON.stringify({ resource: 'deals', id }),
        }).then(() => refresh())
        setDeals((prev) => prev.filter((d) => d.id !== id))
        setSelectedDealId((cur) => (cur === id ? null : cur))
        return
      }
      persist({ deals: deals.filter((d) => d.id !== id) })
      setSelectedDealId((cur) => (cur === id ? null : cur))
    },
    [backend, deals, persist, refresh],
  )

  const addContact = useCallback(
    async (input: AddContactInput): Promise<CrmContact> => {
      if (backend) {
        const data = await apiFetch<{ contact: Parameters<typeof mapApiCrmContact>[0] }>(
          '/api/crm',
          {
            method: 'POST',
            body: JSON.stringify({
              resource: 'contacts',
              name: input.name.trim(),
              email: input.email.trim() || null,
              phone: input.phone || null,
              role: input.title || null,
            }),
          },
        )
        const contact = mapApiCrmContact(data.contact, input.companyName)
        setContacts((prev) => [contact, ...prev])
        return contact
      }

      const contact: CrmContact = {
        id: `ct${Date.now()}`,
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone || '',
        title: input.title || '',
        companyId: null,
        companyName: input.companyName || '—',
        segment: input.segment,
        status: 'lead',
        tags: input.tags || (input.segment === 'b2c' ? ['Local'] : ['Prospect']),
        owner: 'Freya',
        ownerColor: '#38bdf8',
        source: 'Manual',
        lifetimeValue: 0,
        lastTouch: 'Created · Just now',
        nextStep: 'Send welcome hello',
        city: '',
        notes: input.notes || 'Freya will draft a first hello.',
        color: input.segment === 'b2c' ? '#ec4899' : '#3b82f6',
      }
      persist({ contacts: [contact, ...contacts] })
      return contact
    },
    [backend, contacts, persist],
  )

  const updateContact = useCallback(
    (id: string, patch: Partial<CrmContact>) => {
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
      if (backend) {
        const body: Record<string, unknown> = { resource: 'contacts', id }
        if (patch.name != null) body.name = patch.name
        if (patch.email != null) body.email = patch.email
        if (patch.phone != null) body.phone = patch.phone
        if (patch.title != null) body.role = patch.title
        void apiFetch('/api/crm', { method: 'PATCH', body: JSON.stringify(body) }).then(() =>
          refresh(),
        )
        return
      }
      persist({ contacts: contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
    },
    [backend, contacts, persist, refresh],
  )

  const addCompany = useCallback(
    async (input: AddCompanyInput): Promise<CrmCompany> => {
      if (backend) {
        const data = await apiFetch<{ company: Parameters<typeof mapApiCrmCompany>[0] }>(
          '/api/crm',
          {
            method: 'POST',
            body: JSON.stringify({
              resource: 'companies',
              name: input.name.trim(),
              industry: input.industry || null,
            }),
          },
        )
        const company = mapApiCrmCompany(data.company)
        setCompanies((prev) => [company, ...prev])
        return company
      }

      const company: CrmCompany = {
        id: `co${Date.now()}`,
        name: input.name.trim(),
        domain: input.domain || '',
        industry: input.industry || 'Other',
        size: input.size || '1–10',
        segment: input.segment || 'b2b',
        owner: 'Freya',
        ownerColor: '#38bdf8',
        annualPotential: 0,
        city: '',
        status: 'prospect',
        tags: ['Prospect'],
        nextStep: 'Find decision maker',
        lastTouch: 'Created · Just now',
        notes: input.notes || 'New account — Freya will research signals.',
        color: '#6366f1',
      }
      persist({ companies: [company, ...companies] })
      return company
    },
    [backend, companies, persist],
  )

  const updateCompany = useCallback(
    (id: string, patch: Partial<CrmCompany>) => {
      if (backend) {
        const body: Record<string, unknown> = { resource: 'companies', id }
        if (patch.name != null) body.name = patch.name
        if (patch.industry != null) body.industry = patch.industry
        // Non-optimistic: wait for the write, then re-sync from server.
        void apiFetch('/api/crm', { method: 'PATCH', body: JSON.stringify(body) }).then(() =>
          refresh(),
        )
        return
      }
      persist({ companies: companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
    },
    [backend, companies, persist, refresh],
  )

  const toggleActivity = useCallback(
    (id: string) => {
      const current = activities.find((a) => a.id === id)
      if (backend && current) {
        void apiFetch('/api/crm', {
          method: 'PATCH',
          body: JSON.stringify({
            resource: 'activities',
            id,
            completed: !current.done,
          }),
        }).then(() => refresh())
        setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a)))
        return
      }
      persist({
        activities: activities.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
      })
    },
    [backend, activities, persist, refresh],
  )

  const addActivity = useCallback(
    (partial: Omit<CrmActivity, 'id' | 'done'> & { done?: boolean }) => {
      if (backend) {
        void apiFetch('/api/crm', {
          method: 'POST',
          body: JSON.stringify({
            resource: 'activities',
            title: partial.title,
            kind: partial.type,
            dealId: partial.relatedType === 'deal' ? partial.relatedId : null,
            contactId: partial.relatedType === 'contact' ? partial.relatedId : null,
            dueAt: partial.dueDate || null,
          }),
        }).then(() => refresh())
        return
      }
      const activity: CrmActivity = {
        ...partial,
        id: `a${Date.now()}`,
        done: partial.done ?? false,
      }
      persist({ activities: [activity, ...activities] })
    },
    [backend, activities, persist, refresh],
  )

  const dismissInsight = useCallback(
    (id: string) => {
      persist({ insights: insights.filter((i) => i.id !== id) })
    },
    [insights, persist],
  )

  const totals = useMemo(() => {
    const open = deals.filter((d) => !crmStageMeta(d.stage).isClosed)
    const openValue = open.reduce((s, d) => s + d.value, 0)
    const forecast = open.reduce(
      (s, d) => s + d.value * ((crmStageMeta(d.stage).probability ?? 0) / 100),
      0,
    )
    const won = deals
      .filter((d) => d.stage === 'won' || crmStageMeta(d.stage).label.toLowerCase() === 'won')
      .reduce((s, d) => s + d.value, 0)
    return {
      openValue,
      forecast: Math.round(forecast),
      won,
      openCount: open.length,
      b2bOpen: open.filter((d) => d.segment === 'b2b').reduce((s, d) => s + d.value, 0),
      b2cOpen: open.filter((d) => d.segment === 'b2c').reduce((s, d) => s + d.value, 0),
      contacts: contacts.length,
      companies: companies.length,
      tasksDue: activities.filter((a) => !a.done).length,
    }
  }, [deals, contacts, companies, activities, crmStageMeta])

  const value = useMemo(
    () => ({
      deals,
      contacts,
      companies,
      activities,
      insights,
      selectedDealId,
      selectDeal,
      moveDeal,
      addDeal,
      updateDeal,
      removeDeal,
      addContact,
      updateContact,
      addCompany,
      updateCompany,
      toggleActivity,
      addActivity,
      dismissInsight,
      refresh,
      totals,
    }),
    [
      deals,
      contacts,
      companies,
      activities,
      insights,
      selectedDealId,
      selectDeal,
      moveDeal,
      addDeal,
      updateDeal,
      removeDeal,
      addContact,
      updateContact,
      addCompany,
      updateCompany,
      toggleActivity,
      addActivity,
      dismissInsight,
      refresh,
      totals,
    ],
  )

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>
}

export function useCrm() {
  const ctx = useContext(CrmContext)
  if (!ctx) throw new Error('useCrm must be used within CrmProvider')
  return ctx
}

/** Back-compat aliases used by older deal components */
export const PipelineProvider = CrmProvider
export function usePipeline() {
  const crm = useCrm()
  return {
    deals: crm.deals,
    selectedDealId: crm.selectedDealId,
    selectDeal: crm.selectDeal,
    moveDeal: crm.moveDeal,
    addDeal: crm.addDeal,
    updateDeal: crm.updateDeal,
    removeDeal: crm.removeDeal,
    totals: {
      openValue: crm.totals.openValue,
      forecast: crm.totals.forecast,
      won: crm.totals.won,
      openCount: crm.totals.openCount,
      avgDeal: crm.totals.openCount
        ? Math.round(crm.totals.openValue / crm.totals.openCount)
        : 0,
    },
  }
}

export { DEAL_STAGES }
