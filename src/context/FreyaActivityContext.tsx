import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  SEED_FREYA_ACTIVITY,
  type FreyaActivityItem,
  type FreyaActivityStatus,
} from '../data/freyaActivityData'

const STORAGE_KEY = 'antarious-freya-activity-v3'

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
  panelOpen: boolean
  panelTab: FreyaPanelTab
  openPanel: (tab?: FreyaPanelTab) => void
  closePanel: () => void
  setPanelTab: (tab: FreyaPanelTab) => void
}

const FreyaActivityContext = createContext<FreyaActivityContextValue | null>(null)

export function FreyaActivityProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FreyaActivityItem[]>(() => load())
  const [filter, setFilter] = useState<ActivityFilter>('everything')
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<FreyaPanelTab>('chat')

  const persist = useCallback((updater: (prev: FreyaActivityItem[]) => FreyaActivityItem[]) => {
    setItems((prev) => {
      const next = updater(prev)
      save(next)
      return next
    })
  }, [])

  const approve = useCallback(
    (id: string) => {
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
    [persist],
  )

  const approveAll = useCallback(() => {
    let count = 0
    persist((prev) =>
      prev.map((item) => {
        if (item.status !== 'waiting') return item
        count += 1
        return {
          ...item,
          status: 'done' as FreyaActivityStatus,
          detail: 'Approved by you — Freya marked this done.',
          time: 'Just now',
        }
      }),
    )
    return count
  }, [persist])

  const dismiss = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((item) => item.id !== id))
    },
    [persist],
  )

  const prepend = useCallback(
    (item: FreyaActivityItem) => {
      persist((prev) => [item, ...prev])
    },
    [persist],
  )

  const resetDemo = useCallback(() => {
    const fresh = structuredClone(SEED_FREYA_ACTIVITY)
    save(fresh)
    setItems(fresh)
    setFilter('everything')
  }, [])

  const openPanel = useCallback((tab: FreyaPanelTab = 'chat') => {
    setPanelTab(tab)
    setPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => setPanelOpen(false), [])

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
      panelOpen,
      panelTab,
      openPanel,
      closePanel,
      setPanelTab,
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
      panelOpen,
      panelTab,
      openPanel,
      closePanel,
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
