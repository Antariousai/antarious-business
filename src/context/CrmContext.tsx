import {
  createContext,
  useCallback,
  useContext,
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
  stageMeta,
  type CrmActivity,
  type CrmCompany,
  type CrmContact,
  type CrmDeal,
  type CrmSegment,
  type DealPriority,
  type DealStage,
  type FreyaInsight,
} from '../data/crmData'

const STORAGE_KEY = 'antarious-crm-v1'

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
  addDeal: (input: AddDealInput) => CrmDeal
  updateDeal: (id: string, patch: Partial<CrmDeal>) => void
  removeDeal: (id: string) => void
  addContact: (input: AddContactInput) => CrmContact
  updateContact: (id: string, patch: Partial<CrmContact>) => void
  addCompany: (input: AddCompanyInput) => CrmCompany
  updateCompany: (id: string, patch: Partial<CrmCompany>) => void
  toggleActivity: (id: string) => void
  addActivity: (partial: Omit<CrmActivity, 'id' | 'done'> & { done?: boolean }) => void
  dismissInsight: (id: string) => void
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
  const initial = loadCrm()
  const [deals, setDeals] = useState(initial.deals)
  const [contacts, setContacts] = useState(initial.contacts)
  const [companies, setCompanies] = useState(initial.companies)
  const [activities, setActivities] = useState(initial.activities)
  const [insights, setInsights] = useState(initial.insights)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    },
    [deals, contacts, companies, activities, insights],
  )

  const selectDeal = useCallback((id: string | null) => setSelectedDealId(id), [])

  const moveDeal = useCallback(
    (id: string, stage: DealStage) => {
      const meta = stageMeta(stage)
      persist({
        deals: deals.map((d) =>
          d.id === id ? { ...d, stage, lastActivity: `Moved to ${meta.label} · Just now` } : d,
        ),
      })
    },
    [deals, persist],
  )

  const addDeal = useCallback(
    (input: AddDealInput) => {
      const stage = input.stage || 'qualified'
      const owner = input.owner || 'Joy'
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
    [deals, persist],
  )

  const updateDeal = useCallback(
    (id: string, patch: Partial<CrmDeal>) => {
      persist({
        deals: deals.map((d) => {
          if (d.id !== id) return d
          const next = { ...d, ...patch }
          if (patch.owner) next.ownerColor = patch.owner === 'Freya' ? '#38bdf8' : '#64748b'
          return next
        }),
      })
    },
    [deals, persist],
  )

  const removeDeal = useCallback(
    (id: string) => {
      persist({ deals: deals.filter((d) => d.id !== id) })
      setSelectedDealId((cur) => (cur === id ? null : cur))
    },
    [deals, persist],
  )

  const addContact = useCallback(
    (input: AddContactInput) => {
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
    [contacts, persist],
  )

  const updateContact = useCallback(
    (id: string, patch: Partial<CrmContact>) => {
      persist({ contacts: contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
    },
    [contacts, persist],
  )

  const addCompany = useCallback(
    (input: AddCompanyInput) => {
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
    [companies, persist],
  )

  const updateCompany = useCallback(
    (id: string, patch: Partial<CrmCompany>) => {
      persist({ companies: companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
    },
    [companies, persist],
  )

  const toggleActivity = useCallback(
    (id: string) => {
      persist({
        activities: activities.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
      })
    },
    [activities, persist],
  )

  const addActivity = useCallback(
    (partial: Omit<CrmActivity, 'id' | 'done'> & { done?: boolean }) => {
      const activity: CrmActivity = {
        ...partial,
        id: `a${Date.now()}`,
        done: partial.done ?? false,
      }
      persist({ activities: [activity, ...activities] })
    },
    [activities, persist],
  )

  const dismissInsight = useCallback(
    (id: string) => {
      persist({ insights: insights.filter((i) => i.id !== id) })
    },
    [insights, persist],
  )

  const totals = useMemo(() => {
    const open = deals.filter((d) => !stageMeta(d.stage).isClosed)
    const openValue = open.reduce((s, d) => s + d.value, 0)
    const forecast = open.reduce(
      (s, d) => s + d.value * (stageMeta(d.stage).probability / 100),
      0,
    )
    const won = deals.filter((d) => d.stage === 'won').reduce((s, d) => s + d.value, 0)
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
  }, [deals, contacts, companies, activities])

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
