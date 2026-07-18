import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  SEED_THREADS,
  type InboxChannel,
  type InboxMessage,
  type InboxThread,
} from '../data/inboxData'

const STORAGE_KEY = 'antarious-inbox-v1'

function load(): InboxThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(SEED_THREADS)
    const parsed = JSON.parse(raw) as InboxThread[]
    return Array.isArray(parsed) && parsed.length ? parsed : structuredClone(SEED_THREADS)
  } catch {
    return structuredClone(SEED_THREADS)
  }
}

function save(threads: InboxThread[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
}

interface InboxContextValue {
  threads: InboxThread[]
  activeId: string | null
  setActiveId: (id: string) => void
  activeThread: InboxThread | null
  unreadCount: number
  channelFilter: InboxChannel | 'all'
  setChannelFilter: (c: InboxChannel | 'all') => void
  filteredThreads: InboxThread[]
  approveDraft: (threadId: string, messageId: string) => void
  updateDraft: (threadId: string, messageId: string, text: string) => void
  discardDraft: (threadId: string, messageId: string) => void
  sendReply: (threadId: string, text: string) => void
  askFreyaDraft: (threadId: string) => void
  approveAllDrafts: () => number
}

const InboxContext = createContext<InboxContextValue | null>(null)

export function InboxProvider({ children }: { children: ReactNode }) {
  const initial = load()
  const [threads, setThreads] = useState<InboxThread[]>(initial)
  const [activeId, setActiveIdState] = useState<string | null>(initial[0]?.id ?? null)
  const [channelFilter, setChannelFilter] = useState<InboxChannel | 'all'>('all')

  const persist = useCallback((updater: (prev: InboxThread[]) => InboxThread[]) => {
    setThreads((prev) => {
      const next = updater(prev)
      save(next)
      return next
    })
  }, [])

  const setActiveId = useCallback(
    (id: string) => {
      setActiveIdState(id)
      persist((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)))
    },
    [persist],
  )

  const approveDraft = useCallback(
    (threadId: string, messageId: string) => {
      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t
          const draft = t.messages.find((m) => m.id === messageId)
          return {
            ...t,
            unread: false,
            freyaHandling: false,
            preview: draft?.text.slice(0, 48) || t.preview,
            updatedAt: 'Just now',
            messages: t.messages.map((m) =>
              m.id === messageId ? { ...m, kind: 'you' as const, time: 'Just now' } : m,
            ),
          }
        }),
      )
    },
    [persist],
  )

  const updateDraft = useCallback(
    (threadId: string, messageId: string, text: string) => {
      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t
          return {
            ...t,
            messages: t.messages.map((m) => (m.id === messageId ? { ...m, text } : m)),
          }
        }),
      )
    },
    [persist],
  )

  const discardDraft = useCallback(
    (threadId: string, messageId: string) => {
      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t
          const messages = t.messages.filter((m) => m.id !== messageId)
          return {
            ...t,
            freyaHandling: messages.some((m) => m.kind === 'freya-draft'),
            messages,
          }
        }),
      )
    },
    [persist],
  )

  const sendReply = useCallback(
    (threadId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const msg: InboxMessage = {
        id: `m${Date.now()}`,
        kind: 'you',
        text: trimmed,
        time: 'Just now',
      }
      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t
          return {
            ...t,
            unread: false,
            preview: trimmed.slice(0, 48),
            updatedAt: 'Just now',
            messages: [...t.messages.filter((m) => m.kind !== 'freya-draft'), msg],
            freyaHandling: false,
          }
        }),
      )
    },
    [persist],
  )

  const approveAllDrafts = useCallback(() => {
    let count = 0
    persist((prev) =>
      prev.map((t) => {
        const draft = t.messages.find((m) => m.kind === 'freya-draft')
        if (!draft) return t
        count += 1
        return {
          ...t,
          unread: false,
          freyaHandling: false,
          preview: draft.text.slice(0, 48),
          updatedAt: 'Just now',
          messages: t.messages.map((m) =>
            m.id === draft.id ? { ...m, kind: 'you' as const, time: 'Just now' } : m,
          ),
        }
      }),
    )
    return count
  }, [persist])

  const askFreyaDraft = useCallback(
    (threadId: string) => {
      persist((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t
          if (t.messages.some((m) => m.kind === 'freya-draft')) return t
          const draft: InboxMessage = {
            id: `m${Date.now()}`,
            kind: 'freya-draft',
            text: `Thanks for reaching out! Happy to help with that — want a few options, or shall I suggest the best fit?`,
            time: 'Just now',
          }
          return { ...t, freyaHandling: true, messages: [...t.messages, draft] }
        }),
      )
    },
    [persist],
  )

  const filteredThreads = useMemo(() => {
    if (channelFilter === 'all') return threads
    return threads.filter((t) => t.channel === channelFilter)
  }, [threads, channelFilter])

  const activeThread = threads.find((t) => t.id === activeId) || null
  const unreadCount = threads.filter((t) => t.unread).length

  const value = useMemo(
    () => ({
      threads,
      activeId,
      setActiveId,
      activeThread,
      unreadCount,
      channelFilter,
      setChannelFilter,
      filteredThreads,
      approveDraft,
      updateDraft,
      discardDraft,
      sendReply,
      askFreyaDraft,
      approveAllDrafts,
    }),
    [
      threads,
      activeId,
      setActiveId,
      activeThread,
      unreadCount,
      channelFilter,
      filteredThreads,
      approveDraft,
      updateDraft,
      discardDraft,
      sendReply,
      askFreyaDraft,
      approveAllDrafts,
    ],
  )

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
}

export function useInbox() {
  const ctx = useContext(InboxContext)
  if (!ctx) throw new Error('useInbox must be used within InboxProvider')
  return ctx
}
