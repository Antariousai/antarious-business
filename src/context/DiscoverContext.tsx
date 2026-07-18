import {
  createContext,
  useCallback,
  useContext,
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

const STORAGE_KEY = 'antarious-discover-v1'

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
}

const DiscoverContext = createContext<DiscoverContextValue | null>(null)

export function DiscoverProvider({ children }: { children: ReactNode }) {
  const initial = load()
  const [data, setData] = useState<StoredDiscover>(initial)
  const [typeFilter, setTypeFilter] = useState<SignalType | 'all'>('all')

  const persist = useCallback((updater: (prev: StoredDiscover) => StoredDiscover) => {
    setData((prev) => {
      const next = updater(prev)
      save(next)
      return next
    })
  }, [])

  const markConverted = useCallback(
    (signalId: string) => {
      persist((prev) => ({
        ...prev,
        signals: prev.signals.map((s) =>
          s.id === signalId ? { ...s, status: 'converted' as const } : s,
        ),
      }))
    },
    [persist],
  )

  const saveSignal = useCallback(
    (signalId: string) => {
      persist((prev) => ({
        ...prev,
        signals: prev.signals.map((s) =>
          s.id === signalId && s.status === 'new' ? { ...s, status: 'saved' as const } : s,
        ),
      }))
    },
    [persist],
  )

  const dismissSignal = useCallback(
    (signalId: string) => {
      persist((prev) => ({
        ...prev,
        signals: prev.signals.map((s) =>
          s.id === signalId ? { ...s, status: 'dismissed' as const } : s,
        ),
      }))
    },
    [persist],
  )

  const saveIdea = useCallback(
    (ideaId: string) => {
      persist((prev) => ({
        ...prev,
        ideas: prev.ideas.map((i) =>
          i.id === ideaId ? { ...i, status: 'saved' as const } : i,
        ),
      }))
    },
    [persist],
  )

  const useIdea = useCallback(
    (ideaId: string) => {
      persist((prev) => ({
        ...prev,
        ideas: prev.ideas.map((i) =>
          i.id === ideaId ? { ...i, status: 'used' as const } : i,
        ),
      }))
    },
    [persist],
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
    const fresh = defaults()
    save(fresh)
    setData(fresh)
    setTypeFilter('all')
  }, [])

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
    ],
  )

  return <DiscoverContext.Provider value={value}>{children}</DiscoverContext.Provider>
}

export function useDiscover() {
  const ctx = useContext(DiscoverContext)
  if (!ctx) throw new Error('useDiscover must be used within DiscoverProvider')
  return ctx
}
