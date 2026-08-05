/** Local multi-thread Freya chat history (browser localStorage). */

export type FreyaStoredMsg = {
  id: string
  role: 'freya' | 'you'
  text: string
  cards?: unknown[]
  followUp?: string
}

export type FreyaChatThread = {
  id: string
  title: string
  /** When true, auto summary must not overwrite the title. */
  titleCustom?: boolean
  createdAt: number
  updatedAt: number
  messages: FreyaStoredMsg[]
}

export type FreyaChatStore = {
  activeId: string
  threads: FreyaChatThread[]
}

const STORE_PREFIX = 'antarious-freya-chats-v2'
const LEGACY_PREFIX = 'antarious-freya-chat-v1'
export const MAX_THREADS = 30
export const MAX_MSGS_PER_THREAD = 80
export const MAX_TITLE_LEN = 48

export function freyaChatStoreKey(organizationId: string | null) {
  return `${STORE_PREFIX}:${organizationId || 'local'}`
}

function legacyKey(organizationId: string | null) {
  return `${LEGACY_PREFIX}:${organizationId || 'local'}`
}

function cleanMessages(parsed: unknown): FreyaStoredMsg[] {
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(
      (m): m is FreyaStoredMsg =>
        !!m &&
        typeof m === 'object' &&
        typeof (m as FreyaStoredMsg).id === 'string' &&
        ((m as FreyaStoredMsg).role === 'freya' || (m as FreyaStoredMsg).role === 'you') &&
        typeof (m as FreyaStoredMsg).text === 'string',
    )
    .map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      cards: Array.isArray(m.cards) ? m.cards : undefined,
      followUp: typeof m.followUp === 'string' ? m.followUp : undefined,
    }))
    .filter((m) => m.text.trim().length > 0 || (m.cards && m.cards.length > 0) || m.followUp)
    .slice(-MAX_MSGS_PER_THREAD)
}

export function threadHasUserContent(messages: FreyaStoredMsg[]): boolean {
  return messages.some((m) => m.role === 'you' && m.text.trim().length > 0)
}

/** Compress a user ask into a short history label (not LLM — instant). */
export function shortSummaryTitle(text: string, fallback = 'New chat'): string {
  let t = text.trim().replace(/\s+/g, ' ')
  if (!t) return fallback

  t = t
    .replace(/^(hey|hi|hello)\b[\s,]*/gi, '')
    .replace(/^(freya)\b[\s,]*/gi, '')
    .replace(/^(please|pls|can you|could you|would you|i need|i want|help me|just)\b[\s,!]*/gi, '')
    .replace(/^(please|pls|can you|could you|would you)\b[\s,!]*/gi, '')
    .replace(/^(to\s+)/i, '')
    .replace(/\b(please|pls)[.!?]*$/i, '')
    .replace(/^(please|pls)\s+/i, '')
    .trim()

  const cut = t.search(/[.?!]|—|–/)
  if (cut > 10) t = t.slice(0, cut).trim()

  const words = t.split(/\s+/).filter(Boolean).slice(0, 6)
  let out = words.join(' ')
  if (out.length > MAX_TITLE_LEN) out = `${out.slice(0, MAX_TITLE_LEN).trim()}…`
  if (!out) {
    const raw = text.trim().replace(/\s+/g, ' ')
    out = raw.length > MAX_TITLE_LEN ? `${raw.slice(0, MAX_TITLE_LEN)}…` : raw
  }
  if (!out) return fallback
  return out.charAt(0).toUpperCase() + out.slice(1)
}

/** Auto title from first user message (short summary). */
export function titleFromMessages(messages: FreyaStoredMsg[], fallback = 'New chat'): string {
  const firstYou = messages.find((m) => m.role === 'you' && m.text.trim())
  if (!firstYou) return fallback
  return shortSummaryTitle(firstYou.text, fallback)
}

function resolveTitle(thread: Pick<FreyaChatThread, 'title' | 'titleCustom' | 'messages'>): string {
  if (thread.titleCustom && thread.title?.trim()) {
    return thread.title.trim().replace(/\s+/g, ' ').slice(0, MAX_TITLE_LEN)
  }
  if (threadHasUserContent(thread.messages)) {
    return titleFromMessages(thread.messages, thread.title || 'New chat')
  }
  return thread.title?.trim() || 'New chat'
}

export function newThreadId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyThread(
  opener: FreyaStoredMsg,
  now = Date.now(),
): FreyaChatThread {
  return {
    id: newThreadId(),
    title: 'New chat',
    titleCustom: false,
    createdAt: now,
    updatedAt: now,
    messages: [opener],
  }
}

export function loadFreyaChatStore(
  organizationId: string | null,
  opener: FreyaStoredMsg,
): FreyaChatStore {
  const empty = (): FreyaChatStore => {
    const t = createEmptyThread(opener)
    return { activeId: t.id, threads: [t] }
  }

  try {
    const raw = localStorage.getItem(freyaChatStoreKey(organizationId))
    if (raw) {
      const parsed = JSON.parse(raw) as FreyaChatStore
      if (
        parsed &&
        typeof parsed.activeId === 'string' &&
        Array.isArray(parsed.threads) &&
        parsed.threads.length
      ) {
        const threads: FreyaChatThread[] = []
        for (const t of parsed.threads) {
          const messages = cleanMessages(t.messages)
          if (!messages.length) continue
          const titleCustom = !!t.titleCustom
          const title =
            typeof t.title === 'string' && t.title.trim()
              ? t.title.trim()
              : titleFromMessages(messages)
          threads.push({
            id: String(t.id),
            title: titleCustom ? title.slice(0, MAX_TITLE_LEN) : titleFromMessages(messages, title),
            titleCustom,
            createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
            updatedAt: typeof t.updatedAt === 'number' ? t.updatedAt : Date.now(),
            messages,
          })
          if (threads.length >= MAX_THREADS) break
        }

        if (!threads.length) return empty()
        const activeId = threads.some((t) => t.id === parsed.activeId)
          ? parsed.activeId
          : threads[0].id
        return { activeId, threads }
      }
    }

    // Migrate v1 single transcript → one thread
    const legacy = localStorage.getItem(legacyKey(organizationId))
    if (legacy) {
      const messages = cleanMessages(JSON.parse(legacy))
      if (messages.length) {
        const now = Date.now()
        const thread: FreyaChatThread = {
          id: newThreadId(),
          title: titleFromMessages(messages),
          titleCustom: false,
          createdAt: now,
          updatedAt: now,
          messages,
        }
        const store = { activeId: thread.id, threads: [thread] }
        saveFreyaChatStore(organizationId, store)
        return store
      }
    }
  } catch {
    /* private mode / bad JSON */
  }

  return empty()
}

export function saveFreyaChatStore(organizationId: string | null, store: FreyaChatStore) {
  try {
    const threads = store.threads
      .map((t) => ({
        ...t,
        title: resolveTitle(t),
        titleCustom: !!t.titleCustom,
        messages: cleanMessages(t.messages),
      }))
      .filter((t) => t.messages.length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_THREADS)

    if (!threads.length) return
    const activeId = threads.some((t) => t.id === store.activeId) ? store.activeId : threads[0].id
    localStorage.setItem(
      freyaChatStoreKey(organizationId),
      JSON.stringify({ activeId, threads } satisfies FreyaChatStore),
    )
  } catch {
    /* quota / private mode */
  }
}

export function upsertActiveThread(
  store: FreyaChatStore,
  messages: FreyaStoredMsg[],
): FreyaChatStore {
  const now = Date.now()
  const slim = cleanMessages(messages)
  const idx = store.threads.findIndex((t) => t.id === store.activeId)
  if (idx < 0) {
    const t = createEmptyThread(
      slim[0] || { id: 'c0', role: 'freya', text: 'Hey!' },
      now,
    )
    t.messages = slim.length ? slim : t.messages
    t.title = titleFromMessages(t.messages)
    t.titleCustom = false
    t.updatedAt = now
    return { activeId: t.id, threads: [t, ...store.threads].slice(0, MAX_THREADS) }
  }
  const next = [...store.threads]
  const prev = next[idx]
  const msgs = slim.length ? slim : prev.messages
  next[idx] = {
    ...prev,
    messages: msgs,
    title: prev.titleCustom ? prev.title : titleFromMessages(msgs, prev.title || 'New chat'),
    titleCustom: !!prev.titleCustom,
    updatedAt: now,
  }
  return { activeId: store.activeId, threads: next }
}

export function startNewChat(
  store: FreyaChatStore,
  opener: FreyaStoredMsg,
): FreyaChatStore {
  // Drop unused empty "New chat" threads so they don't pile up
  const kept = store.threads.filter(
    (t) => t.id === store.activeId || threadHasUserContent(t.messages),
  )
  const withActive = upsertActiveThread(
    { ...store, threads: kept },
    kept.find((t) => t.id === store.activeId)?.messages || [],
  )
  const fresh = createEmptyThread(opener)
  return {
    activeId: fresh.id,
    threads: [fresh, ...withActive.threads.filter((t) => threadHasUserContent(t.messages))].slice(
      0,
      MAX_THREADS,
    ),
  }
}

export function switchChat(store: FreyaChatStore, threadId: string): FreyaChatStore {
  if (!store.threads.some((t) => t.id === threadId)) return store
  return { ...store, activeId: threadId }
}

export function renameChat(
  store: FreyaChatStore,
  threadId: string,
  title: string,
): FreyaChatStore {
  const trimmed = title.trim().replace(/\s+/g, ' ').slice(0, MAX_TITLE_LEN)
  if (!trimmed) return store
  return {
    ...store,
    threads: store.threads.map((t) =>
      t.id === threadId
        ? { ...t, title: trimmed, titleCustom: true, updatedAt: Date.now() }
        : t,
    ),
  }
}

export function deleteChat(
  store: FreyaChatStore,
  threadId: string,
  opener: FreyaStoredMsg,
): FreyaChatStore {
  const threads = store.threads.filter((t) => t.id !== threadId)
  if (!threads.length) {
    const t = createEmptyThread(opener)
    return { activeId: t.id, threads: [t] }
  }
  const activeId = store.activeId === threadId ? threads[0].id : store.activeId
  return { activeId, threads }
}

export function formatThreadTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}
