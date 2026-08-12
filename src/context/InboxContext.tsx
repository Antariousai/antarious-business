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
  SEED_THREADS,
  type InboxChannel,
  type InboxMessage,
  type InboxThread,
} from '../data/inboxData'
import { apiFetch } from '@/lib/backend/api'
import { mapApiMessage, mapApiThread } from '@/lib/backend/mappers'
import { useBackendMode } from '@/lib/backend/BackendModeContext'

const STORAGE_KEY = 'antarious-inbox-v2-bd'

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
  refresh: () => Promise<void>
}

const InboxContext = createContext<InboxContextValue | null>(null)

export function InboxProvider({ children }: { children: ReactNode }) {
  const { backend, ready } = useBackendMode()
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [activeId, setActiveIdState] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState<InboxChannel | 'all'>('all')

  const loadMessagesForThread = useCallback(async (threadId: string) => {
    const data = await apiFetch<{ messages: Parameters<typeof mapApiMessage>[0][] }>(
      `/api/inbox/messages?threadId=${encodeURIComponent(threadId)}`,
    )
    return (data.messages ?? []).map(mapApiMessage)
  }, [])

  const refresh = useCallback(async () => {
    if (!backend) return
    const data = await apiFetch<{ threads: Parameters<typeof mapApiThread>[0][] }>(
      '/api/inbox/threads',
    )
    const base = data.threads ?? []
    const withMessages = await Promise.all(
      base.map(async (row) => {
        try {
          const messages = await loadMessagesForThread(row.id)
          return mapApiThread(row, messages)
        } catch {
          return mapApiThread(row, [])
        }
      }),
    )
    setThreads(withMessages)
    setActiveIdState((cur) => cur ?? withMessages[0]?.id ?? null)
  }, [backend, loadMessagesForThread])

  useEffect(() => {
    if (!ready) return
    if (!backend) {
      const initial = load()
      setThreads(initial)
      setActiveIdState(initial[0]?.id ?? null)
      return
    }
    let cancelled = false
    void refresh().catch(() => {
      if (!cancelled) setThreads([])
    })
    // Lightweight polling until Supabase Realtime is wired for inbox.
    const poll = window.setInterval(() => {
      void refresh().catch(() => {})
    }, 8000)
    return () => {
      cancelled = true
      window.clearInterval(poll)
    }
  }, [backend, ready, refresh])

  const persist = useCallback((updater: (prev: InboxThread[]) => InboxThread[]) => {
    setThreads((prev) => {
      const next = updater(prev)
      if (!backend) save(next)
      return next
    })
  }, [backend])

  const setActiveId = useCallback(
    (id: string) => {
      setActiveIdState(id)
      persist((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)))
    },
    [persist],
  )

  const approveDraft = useCallback(
    (threadId: string, messageId: string) => {
      if (backend) {
        void apiFetch('/api/inbox/messages', {
          method: 'PATCH',
          body: JSON.stringify({ id: messageId, action: 'approve' }),
        }).then(() => refresh())
        return
      }
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
    [backend, persist, refresh],
  )

  const updateDraft = useCallback(
    (threadId: string, messageId: string, text: string) => {
      if (backend) {
        void apiFetch('/api/inbox/messages', {
          method: 'PATCH',
          body: JSON.stringify({ id: messageId, action: 'update', body: text }),
        }).then(() => refresh())
        return
      }
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
    [backend, persist, refresh],
  )

  const discardDraft = useCallback(
    (threadId: string, messageId: string) => {
      if (backend) {
        void apiFetch('/api/inbox/messages', {
          method: 'PATCH',
          body: JSON.stringify({ id: messageId, action: 'discard' }),
        }).then(() => refresh())
        return
      }
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
    [backend, persist, refresh],
  )

  const sendReply = useCallback(
    (threadId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (backend) {
        void apiFetch('/api/inbox/messages', {
          method: 'POST',
          body: JSON.stringify({ threadId, body: trimmed, kind: 'you' }),
        }).then(() => refresh())
        return
      }
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
    [backend, persist, refresh],
  )

  const approveAllDrafts = useCallback(() => {
    let count = 0
    if (backend) {
      const drafts = threads.flatMap((t) =>
        t.messages.filter((m) => m.kind === 'freya-draft').map((m) => m.id),
      )
      count = drafts.length
      void Promise.all(
        drafts.map((id) =>
          apiFetch('/api/inbox/messages', {
            method: 'PATCH',
            body: JSON.stringify({ id, action: 'approve' }),
          }),
        ),
      ).then(() => refresh())
      return count
    }
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
  }, [backend, persist, refresh, threads])

  const askFreyaDraft = useCallback(
    (threadId: string) => {
      if (backend) {
        void apiFetch('/api/inbox/suggest', {
          method: 'POST',
          body: JSON.stringify({ threadId }),
        })
          .then(() => refresh())
          .catch(() =>
            apiFetch('/api/inbox/messages', {
              method: 'POST',
              body: JSON.stringify({
                threadId,
                kind: 'freya_draft',
                body: `Thanks for reaching out! Happy to help with that — want a few options, or shall I suggest the best fit?`,
              }),
            }).then(() => refresh()),
          )
        return
      }
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
    [backend, persist, refresh],
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
      refresh,
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
      refresh,
    ],
  )

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
}

export function useInbox() {
  const ctx = useContext(InboxContext)
  if (!ctx) throw new Error('useInbox must be used within InboxProvider')
  return ctx
}
