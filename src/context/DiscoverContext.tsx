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
  SEED_COMPETITORS,
  SEED_IDEAS,
  SEED_INSIGHTS,
  SEED_SIGNALS,
  SEED_TRENDS,
  type CompetitorWatch,
  type ContentIdea,
  type DiscoverInsight,
  type DiscoverSignal,
  type DiscoverTrend,
  type SignalType,
} from '../data/discoverData'
import { apiFetch } from '@/lib/backend/api'
import {
  mapApiCompetitorWatch,
  mapApiContentIdea,
  mapApiDiscoverInsight,
  mapApiDiscoverSignal,
  mapApiDiscoverTrend,
} from '@/lib/backend/mappers'
import { useBackendMode } from '@/lib/backend/BackendModeContext'

const STORAGE_KEY = 'antarious-discover-v2-bd'

interface StoredDiscover {
  signals: DiscoverSignal[]
  trends: DiscoverTrend[]
  ideas: ContentIdea[]
  competitors: CompetitorWatch[]
  insights: DiscoverInsight[]
}

function defaults(): StoredDiscover {
  return {
    signals: structuredClone(SEED_SIGNALS),
    trends: structuredClone(SEED_TRENDS),
    ideas: structuredClone(SEED_IDEAS),
    competitors: structuredClone(SEED_COMPETITORS),
    insights: structuredClone(SEED_INSIGHTS),
  }
}

function emptyBackend(): StoredDiscover {
  return {
    signals: [],
    trends: [],
    ideas: [],
    competitors: [],
    insights: [],
  }
}

function load(): StoredDiscover {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<StoredDiscover>
    const base = defaults()
    return {
      signals: parsed.signals?.length ? parsed.signals : base.signals,
      trends: parsed.trends?.length ? parsed.trends : base.trends,
      ideas: parsed.ideas?.length ? parsed.ideas : base.ideas,
      competitors: parsed.competitors?.length ? parsed.competitors : base.competitors,
      insights: parsed.insights?.length ? parsed.insights : base.insights,
    }
  } catch {
    return defaults()
  }
}

function save(data: StoredDiscover) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

interface DiscoverContextValue {
  signals: DiscoverSignal[]
  trends: DiscoverTrend[]
  ideas: ContentIdea[]
  competitors: CompetitorWatch[]
  insights: DiscoverInsight[]
  newSignalCount: number
  typeFilter: SignalType | 'all'
  setTypeFilter: (t: SignalType | 'all') => void
  filteredSignals: DiscoverSignal[]
  markConverted: (signalId: string) => void
  saveSignal: (signalId: string) => void
  dismissSignal: (signalId: string) => void
  saveIdea: (ideaId: string) => void
  useIdea: (ideaId: string) => void
  dismissInsight: (id: string) => void
  resetDemo: () => void
  refresh: () => Promise<void>
  runRefresh: () => Promise<void>
  refreshing: boolean
}

const DiscoverContext = createContext<DiscoverContextValue | null>(null)

export function DiscoverProvider({ children }: { children: ReactNode }) {
  const { backend, ready } = useBackendMode()
  const [data, setData] = useState<StoredDiscover>(emptyBackend)
  const [typeFilter, setTypeFilter] = useState<SignalType | 'all'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    if (!backend) return
    const res = await apiFetch<{
      signals: Parameters<typeof mapApiDiscoverSignal>[0][]
      ideas: Parameters<typeof mapApiContentIdea>[0][]
      insights?: Parameters<typeof mapApiDiscoverInsight>[0][]
      trends?: Parameters<typeof mapApiDiscoverTrend>[0][]
      competitors?: Parameters<typeof mapApiCompetitorWatch>[0][]
    }>('/api/discover/refresh')
    setData({
      signals: (res.signals ?? []).map(mapApiDiscoverSignal),
      ideas: (res.ideas ?? []).map(mapApiContentIdea),
      insights: (res.insights ?? []).map(mapApiDiscoverInsight),
      trends: (res.trends ?? []).map(mapApiDiscoverTrend),
      competitors: (res.competitors ?? []).map(mapApiCompetitorWatch),
    })
  }, [backend])

  const runRefresh = useCallback(async () => {
    if (!backend) {
      resetDemoLocal()
      return
    }
    setRefreshing(true)
    try {
      await apiFetch('/api/discover/refresh', { method: 'POST' })
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }, [backend, refresh])

  function resetDemoLocal() {
    const fresh = defaults()
    save(fresh)
    setData(fresh)
    setTypeFilter('all')
  }

  useEffect(() => {
    if (!ready) return
    if (!backend) {
      setData(load())
      return
    }
    let cancelled = false
    void refresh().catch(() => {
      if (!cancelled) setData(emptyBackend())
    })
    return () => {
      cancelled = true
    }
  }, [backend, ready, refresh])

  const persist = useCallback(
    (updater: (prev: StoredDiscover) => StoredDiscover) => {
      setData((prev) => {
        const next = updater(prev)
        if (!backend) save(next)
        return next
      })
    },
    [backend],
  )

  const patchSignalStatus = useCallback(
    (signalId: string, status: DiscoverSignal['status']) => {
      if (backend) {
        void apiFetch('/api/discover/refresh', {
          method: 'PATCH',
          body: JSON.stringify({ resource: 'signals', id: signalId, status }),
        })
      }
      persist((prev) => ({
        ...prev,
        signals: prev.signals.map((s) => (s.id === signalId ? { ...s, status } : s)),
      }))
    },
    [backend, persist],
  )

  const markConverted = useCallback(
    (signalId: string) => patchSignalStatus(signalId, 'converted'),
    [patchSignalStatus],
  )

  const saveSignal = useCallback(
    (signalId: string) => {
      persist((prev) => ({
        ...prev,
        signals: prev.signals.map((s) =>
          s.id === signalId && s.status === 'new' ? { ...s, status: 'saved' as const } : s,
        ),
      }))
      if (backend) {
        void apiFetch('/api/discover/refresh', {
          method: 'PATCH',
          body: JSON.stringify({ resource: 'signals', id: signalId, status: 'saved' }),
        })
      }
    },
    [backend, persist],
  )

  const dismissSignal = useCallback(
    (signalId: string) => patchSignalStatus(signalId, 'dismissed'),
    [patchSignalStatus],
  )

  const saveIdea = useCallback(
    (ideaId: string) => {
      if (backend) {
        void apiFetch('/api/discover/refresh', {
          method: 'PATCH',
          body: JSON.stringify({ resource: 'ideas', id: ideaId, status: 'saved' }),
        })
      }
      persist((prev) => ({
        ...prev,
        ideas: prev.ideas.map((i) =>
          i.id === ideaId ? { ...i, status: 'saved' as const } : i,
        ),
      }))
    },
    [backend, persist],
  )

  const useIdea = useCallback(
    (ideaId: string) => {
      if (backend) {
        void apiFetch('/api/discover/refresh', {
          method: 'PATCH',
          body: JSON.stringify({ resource: 'ideas', id: ideaId, status: 'used' }),
        })
      }
      persist((prev) => ({
        ...prev,
        ideas: prev.ideas.map((i) =>
          i.id === ideaId ? { ...i, status: 'used' as const } : i,
        ),
      }))
    },
    [backend, persist],
  )

  const dismissInsight = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        insights: prev.insights.filter((i) => i.id !== id),
      }))
    },
    [persist],
  )

  const resetDemo = useCallback(() => {
    if (backend) {
      void runRefresh()
      return
    }
    resetDemoLocal()
  }, [backend, runRefresh])

  const filteredSignals = useMemo(() => {
    const visible = data.signals.filter((s) => s.status !== 'dismissed')
    if (typeFilter === 'all') return visible
    return visible.filter((s) => s.type === typeFilter)
  }, [data.signals, typeFilter])

  const newSignalCount = data.signals.filter((s) => s.status === 'new').length

  const value = useMemo(
    () => ({
      signals: data.signals,
      trends: data.trends,
      ideas: data.ideas,
      competitors: data.competitors,
      insights: data.insights,
      newSignalCount,
      typeFilter,
      setTypeFilter,
      filteredSignals,
      markConverted,
      saveSignal,
      dismissSignal,
      saveIdea,
      useIdea,
      dismissInsight,
      resetDemo,
      refresh,
      runRefresh,
      refreshing,
    }),
    [
      data,
      newSignalCount,
      typeFilter,
      filteredSignals,
      markConverted,
      saveSignal,
      dismissSignal,
      saveIdea,
      useIdea,
      dismissInsight,
      resetDemo,
      refresh,
      runRefresh,
      refreshing,
    ],
  )

  return <DiscoverContext.Provider value={value}>{children}</DiscoverContext.Provider>
}

export function useDiscover() {
  const ctx = useContext(DiscoverContext)
  if (!ctx) throw new Error('useDiscover must be used within DiscoverProvider')
  return ctx
}
