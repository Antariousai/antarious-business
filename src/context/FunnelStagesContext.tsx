'use client'

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
  DEFAULT_CRM_STAGES,
  DEFAULT_LEAD_STAGES,
  nextStageColor,
  slugStageKey,
  sortStages,
  type FunnelKind,
  type FunnelStage,
} from '@/data/funnelStages'
import { apiFetch } from '@/lib/backend/api'
import { useBackendMode } from '@/lib/backend/BackendModeContext'
import { useApp } from '@/context/AppContext'

const STORAGE_KEY = 'antarious-funnel-stages-v1'

type Stored = { leads: FunnelStage[]; crm: FunnelStage[] }

function loadLocal(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { leads: structuredClone(DEFAULT_LEAD_STAGES), crm: structuredClone(DEFAULT_CRM_STAGES) }
    const parsed = JSON.parse(raw) as Partial<Stored>
    return {
      leads: parsed.leads?.length ? parsed.leads : structuredClone(DEFAULT_LEAD_STAGES),
      crm: parsed.crm?.length ? parsed.crm : structuredClone(DEFAULT_CRM_STAGES),
    }
  } catch {
    return { leads: structuredClone(DEFAULT_LEAD_STAGES), crm: structuredClone(DEFAULT_CRM_STAGES) }
  }
}

interface FunnelStagesContextValue {
  leadStages: FunnelStage[]
  crmStages: FunnelStage[]
  loading: boolean
  refresh: () => Promise<void>
  addStage: (funnel: FunnelKind, label: string) => Promise<FunnelStage | null>
  renameStage: (funnel: FunnelKind, id: string, label: string) => Promise<void>
  removeStage: (funnel: FunnelKind, id: string) => Promise<void>
  crmStageMeta: (key: string) => FunnelStage
  leadStageMeta: (key: string) => FunnelStage
}

const FunnelStagesContext = createContext<FunnelStagesContextValue | null>(null)

export function FunnelStagesProvider({ children }: { children: ReactNode }) {
  const { backend, ready } = useBackendMode()
  const { canAccess } = useApp()
  const [leadStages, setLeadStages] = useState<FunnelStage[]>(DEFAULT_LEAD_STAGES)
  const [crmStages, setCrmStages] = useState<FunnelStage[]>(DEFAULT_CRM_STAGES)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!backend) {
      const local = loadLocal()
      setLeadStages(sortStages(local.leads))
      setCrmStages(sortStages(local.crm))
      setLoading(false)
      return
    }

    setLoading(true)
    const jobs: Promise<void>[] = []
    if (canAccess('leads')) {
      jobs.push(
        apiFetch<{ stages: FunnelStage[] }>('/api/funnel-stages?funnel=leads')
          .then((data) => setLeadStages(sortStages(data.stages ?? [])))
          .catch(() => setLeadStages(DEFAULT_LEAD_STAGES)),
      )
    } else {
      setLeadStages(DEFAULT_LEAD_STAGES)
    }
    if (canAccess('customers')) {
      jobs.push(
        apiFetch<{ stages: FunnelStage[] }>('/api/funnel-stages?funnel=crm')
          .then((data) => setCrmStages(sortStages(data.stages ?? [])))
          .catch(() => setCrmStages(DEFAULT_CRM_STAGES)),
      )
    } else {
      setCrmStages(DEFAULT_CRM_STAGES)
    }
    await Promise.allSettled(jobs)
    setLoading(false)
  }, [backend, canAccess])

  useEffect(() => {
    if (!ready) return
    void refresh()
  }, [ready, refresh])

  const persistLocal = useCallback((next: Stored) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setLeadStages(sortStages(next.leads))
    setCrmStages(sortStages(next.crm))
  }, [])

  const addStage = useCallback(
    async (funnel: FunnelKind, label: string) => {
      const trimmed = label.trim()
      if (!trimmed) return null

      if (!backend) {
        const local = loadLocal()
        const list = funnel === 'leads' ? local.leads : local.crm
        let key = slugStageKey(trimmed)
        const used = new Set(list.map((s) => s.key))
        if (used.has(key)) {
          let i = 2
          while (used.has(`${key}_${i}`)) i += 1
          key = `${key}_${i}`
        }
        const closedIdx = list.findIndex((s) => s.isClosed)
        const position =
          closedIdx >= 0 ? list[closedIdx].position : (list[list.length - 1]?.position ?? -1) + 1
        const stage: FunnelStage = {
          id: key,
          key,
          label: trimmed,
          position,
          color: nextStageColor(list),
          probability: funnel === 'crm' ? 50 : undefined,
          isClosed: false,
        }
        const nextList = list.map((s) =>
          s.position >= position ? { ...s, position: s.position + 1 } : s,
        )
        nextList.push(stage)
        persistLocal(
          funnel === 'leads'
            ? { leads: nextList, crm: local.crm }
            : { leads: local.leads, crm: nextList },
        )
        return stage
      }

      const data = await apiFetch<{ stage: FunnelStage }>('/api/funnel-stages', {
        method: 'POST',
        body: JSON.stringify({
          funnel,
          label: trimmed,
          color: nextStageColor(funnel === 'leads' ? leadStages : crmStages),
          probability: funnel === 'crm' ? 50 : undefined,
        }),
      })
      await refresh()
      return data.stage
    },
    [backend, persistLocal, refresh, leadStages, crmStages],
  )

  const renameStage = useCallback(
    async (funnel: FunnelKind, id: string, label: string) => {
      const trimmed = label.trim()
      if (!trimmed) return
      if (!backend) {
        const local = loadLocal()
        const list = (funnel === 'leads' ? local.leads : local.crm).map((s) =>
          s.id === id || s.key === id ? { ...s, label: trimmed } : s,
        )
        persistLocal(
          funnel === 'leads' ? { leads: list, crm: local.crm } : { leads: local.leads, crm: list },
        )
        return
      }
      await apiFetch('/api/funnel-stages', {
        method: 'PATCH',
        body: JSON.stringify({ id, label: trimmed }),
      })
      await refresh()
    },
    [backend, persistLocal, refresh],
  )

  const removeStage = useCallback(
    async (funnel: FunnelKind, id: string) => {
      if (!backend) {
        const local = loadLocal()
        const list = (funnel === 'leads' ? local.leads : local.crm).filter(
          (s) => s.id !== id && s.key !== id,
        )
        if (list.length < 1) return
        persistLocal(
          funnel === 'leads' ? { leads: list, crm: local.crm } : { leads: local.leads, crm: list },
        )
        return
      }
      await apiFetch(`/api/funnel-stages?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await refresh()
    },
    [backend, persistLocal, refresh],
  )

  const leadStageMeta = useCallback(
    (key: string) => leadStages.find((s) => s.key === key) ?? leadStages[0] ?? DEFAULT_LEAD_STAGES[0],
    [leadStages],
  )

  const crmStageMeta = useCallback(
    (key: string) => crmStages.find((s) => s.key === key) ?? crmStages[0] ?? DEFAULT_CRM_STAGES[0],
    [crmStages],
  )

  const value = useMemo(
    () => ({
      leadStages,
      crmStages,
      loading,
      refresh,
      addStage,
      renameStage,
      removeStage,
      crmStageMeta,
      leadStageMeta,
    }),
    [
      leadStages,
      crmStages,
      loading,
      refresh,
      addStage,
      renameStage,
      removeStage,
      crmStageMeta,
      leadStageMeta,
    ],
  )

  return (
    <FunnelStagesContext.Provider value={value}>{children}</FunnelStagesContext.Provider>
  )
}

export function useFunnelStages() {
  const ctx = useContext(FunnelStagesContext)
  if (!ctx) throw new Error('useFunnelStages must be used within FunnelStagesProvider')
  return ctx
}
