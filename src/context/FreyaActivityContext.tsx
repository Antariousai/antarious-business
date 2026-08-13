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
  SEED_FREYA_ACTIVITY,
  type FreyaActivityItem,
  type FreyaActivityStatus,
} from '../data/freyaActivityData'
import { apiFetch } from '@/lib/backend/api'
import { approveFreyaActivities } from '@/lib/backend/freyaChat'
import { mapApiActivity } from '@/lib/backend/mappers'
import { useBackendMode } from '@/lib/backend/BackendModeContext'
import { hasSupabaseEnv } from '@/lib/backend/mode'

const STORAGE_KEY = 'antarious-freya-activity-v4-bd'

function load(): FreyaActivityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(SEED_FREYA_ACTIVITY)
    const parsed = JSON.parse(raw) as FreyaActivityItem[]
    return Array.isArray(parsed) && parsed.length
      ? parsed
      : structuredClone(SEED_FREYA_ACTIVITY)
  } catch {
    return structuredClone(SEED_FREYA_ACTIVITY)
  }
}

function save(items: FreyaActivityItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export type ActivityFilter = 'everything' | 'waiting' | 'done' | 'working'
export type FreyaPanelTab = 'chat' | 'activity'

export type FreyaChatHandoff = {
  prompt: string
  label?: string
  mode?: 'paste' | 'send'
}

interface FreyaActivityContextValue {
  items: FreyaActivityItem[]
  filter: ActivityFilter
  setFilter: (f: ActivityFilter) => void
  filtered: FreyaActivityItem[]
  waitingCount: number
  workingCount: number
  doneCount: number
  approve: (id: string) => void
  approveAll: () => number
  dismiss: (id: string) => void
  prepend: (item: FreyaActivityItem) => void
  resetDemo: () => void
  refresh: () => Promise<void>
  panelOpen: boolean
  panelTab: FreyaPanelTab
  openPanel: (tab?: FreyaPanelTab) => void
  closePanel: () => void
  setPanelTab: (tab: FreyaPanelTab) => void
  /** Open Ask Freya chat with a prompt/context from a create modal. */
  askFreya: (handoff: FreyaChatHandoff) => void
  chatHandoff: FreyaChatHandoff | null
  clearChatHandoff: () => void
}

const FreyaActivityContext = createContext<FreyaActivityContextValue | null>(null)

export function FreyaActivityProvider({ children }: { children: ReactNode }) {
  const { backend, ready } = useBackendMode()
  const [items, setItems] = useState<FreyaActivityItem[]>([])
  const [filter, setFilter] = useState<ActivityFilter>('everything')
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<FreyaPanelTab>('chat')
  const [chatHandoff, setChatHandoff] = useState<FreyaChatHandoff | null>(null)

  const refresh = useCallback(async () => {
    if (!backend) return
    const data = await apiFetch<{ items: Parameters<typeof mapApiActivity>[0][] }>(
      '/api/freya/activity',
    )
    setItems((data.items ?? []).map(mapApiActivity))
  }, [backend])

  useEffect(() => {
    if (!ready) return
    if (!backend) {
      if (hasSupabaseEnv()) {
        setItems([])
        return
      }
      setItems(load())
      return
    }
    let cancelled = false
    void refresh().catch(() => {
      if (!cancelled) setItems([])
    })
    return () => {
      cancelled = true
    }
  }, [backend, ready, refresh])

  const persist = useCallback(
    (updater: (prev: FreyaActivityItem[]) => FreyaActivityItem[]) => {
      setItems((prev) => {
        const next = updater(prev)
        if (!backend) save(next)
        return next
      })
    },
    [backend],
  )

  const approve = useCallback(
    (id: string) => {
      if (backend) {
        void approveFreyaActivities({ id })
          .then(() => refresh())
          .catch(() => {
            /* keep UI; user can retry */
          })
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'done' as FreyaActivityStatus,
                  detail: 'Approved — Freya applied this.',
                  time: 'Just now',
                }
              : item,
          ),
        )
        return
      }
      persist((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'done' as FreyaActivityStatus,
                detail: 'Approved by you — Freya marked this done.',
                time: 'Just now',
              }
            : item,
        ),
      )
    },
    [backend, persist, refresh],
  )

  const approveAll = useCallback(() => {
    const waiting = items.filter((i) => i.status === 'waiting')
    const count = waiting.length
    if (backend) {
      void approveFreyaActivities({ approveAll: true })
        .then(() => refresh())
        .catch(() => {})
      setItems((prev) =>
        prev.map((item) =>
          item.status !== 'waiting'
            ? item
            : {
                ...item,
                status: 'done' as FreyaActivityStatus,
                detail: 'Approved — Freya applied this.',
                time: 'Just now',
              },
        ),
      )
      return count
    }
    persist((prev) =>
      prev.map((item) => {
        if (item.status !== 'waiting') return item
        return {
          ...item,
          status: 'done' as FreyaActivityStatus,
          detail: 'Approved by you — Freya marked this done.',
          time: 'Just now',
        }
      }),
    )
    return count
  }, [backend, items, persist, refresh])

  const dismiss = useCallback(
    (id: string) => {
      if (backend) {
        void apiFetch(`/api/freya/activity?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }).then(() => refresh())
        setItems((prev) => prev.filter((item) => item.id !== id))
        return
      }
      persist((prev) => prev.filter((item) => item.id !== id))
    },
    [backend, persist, refresh],
  )

  const prepend = useCallback(
    (item: FreyaActivityItem) => {
      persist((prev) => [item, ...prev])
    },
    [persist],
  )

  const resetDemo = useCallback(() => {
    if (backend) {
      void refresh()
      return
    }
    const fresh = structuredClone(SEED_FREYA_ACTIVITY)
    save(fresh)
    setItems(fresh)
    setFilter('everything')
  }, [backend, refresh])

  const openPanel = useCallback((tab: FreyaPanelTab = 'chat') => {
    setPanelTab(tab)
    setPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => setPanelOpen(false), [])

  const askFreya = useCallback((handoff: FreyaChatHandoff) => {
    setChatHandoff(handoff)
    setPanelTab('chat')
    setPanelOpen(true)
  }, [])

  const clearChatHandoff = useCallback(() => setChatHandoff(null), [])

  const waitingCount = items.filter((i) => i.status === 'waiting').length
  const workingCount = items.filter((i) => i.status === 'working').length
  const doneCount = items.filter((i) => i.status === 'done').length

  const filtered = useMemo(() => {
    if (filter === 'everything') return items
    if (filter === 'waiting') return items.filter((i) => i.status === 'waiting')
    if (filter === 'working') return items.filter((i) => i.status === 'working')
    return items.filter((i) => i.status === 'done')
  }, [items, filter])

  const value = useMemo(
    () => ({
      items,
      filter,
      setFilter,
      filtered,
      waitingCount,
      workingCount,
      doneCount,
      approve,
      approveAll,
      dismiss,
      prepend,
      resetDemo,
      refresh,
      panelOpen,
      panelTab,
      openPanel,
      closePanel,
      setPanelTab,
      askFreya,
      chatHandoff,
      clearChatHandoff,
    }),
    [
      items,
      filter,
      filtered,
      waitingCount,
      workingCount,
      doneCount,
      approve,
      approveAll,
      dismiss,
      prepend,
      resetDemo,
      refresh,
      panelOpen,
      panelTab,
      openPanel,
      closePanel,
      askFreya,
      chatHandoff,
      clearChatHandoff,
    ],
  )

  return (
    <FreyaActivityContext.Provider value={value}>{children}</FreyaActivityContext.Provider>
  )
}

export function useFreyaActivity() {
  const ctx = useContext(FreyaActivityContext)
  if (!ctx) throw new Error('useFreyaActivity must be used within FreyaActivityProvider')
  return ctx
}
