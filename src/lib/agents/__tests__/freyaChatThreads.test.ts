import { describe, expect, it, beforeEach } from 'vitest'
import {
  createEmptyThread,
  loadFreyaChatStore,
  renameChat,
  saveFreyaChatStore,
  shortSummaryTitle,
  startNewChat,
  switchChat,
  titleFromMessages,
  upsertActiveThread,
  freyaChatStoreKey,
} from '../../freyaChatThreads'

const opener = { id: 'c0', role: 'freya' as const, text: 'Hey!' }

function mockLocalStorage() {
  const map = new Map<string, string>()
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => map.clear(),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
}

describe('freyaChatThreads', () => {
  beforeEach(() => {
    mockLocalStorage()
  })

  it('makes a short summary title from a long ask', () => {
    expect(
      shortSummaryTitle('Hey Freya, can you please draft a post about Friday specials for me'),
    ).toMatch(/Draft a post about Friday/i)
    expect(shortSummaryTitle('Add Rahim Cafe for 15000').length).toBeLessThanOrEqual(48)
  })

  it('titles from first user message via summary', () => {
    expect(
      titleFromMessages([
        opener,
        { id: '1', role: 'you', text: 'Please write a campaign for Eid trays' },
      ]),
    ).toMatch(/campaign|Eid/i)
  })

  it('keeps custom titles after rename', () => {
    let store = { activeId: 'a', threads: [createEmptyThread(opener)] }
    store.threads[0].id = 'a'
    store = upsertActiveThread(store, [
      opener,
      { id: '1', role: 'you', text: 'Add a customer named Sara' },
    ])
    store = renameChat(store, 'a', 'Sara deal')
    expect(store.threads[0].title).toBe('Sara deal')
    expect(store.threads[0].titleCustom).toBe(true)
    store = upsertActiveThread(store, [
      opener,
      { id: '1', role: 'you', text: 'Add a customer named Sara' },
      { id: '2', role: 'freya', text: 'Saved.' },
    ])
    expect(store.threads[0].title).toBe('Sara deal')
  })

  it('starts a new chat and keeps prior user thread', () => {
    let store = { activeId: 'a', threads: [createEmptyThread(opener)] }
    store.threads[0].id = 'a'
    store = upsertActiveThread(store, [
      opener,
      { id: '1', role: 'you', text: 'Add a customer' },
      { id: '2', role: 'freya', text: 'Got it — name?' },
    ])
    const next = startNewChat(store, opener)
    expect(next.activeId).not.toBe('a')
    expect(next.threads.length).toBe(2)
    expect(next.threads.find((t) => t.id === next.activeId)?.messages).toHaveLength(1)
  })

  it('switches active thread', () => {
    const a = createEmptyThread(opener)
    const b = createEmptyThread({ id: 'c1', role: 'freya', text: 'Hi again' })
    a.messages.push({ id: '1', role: 'you', text: 'First' })
    b.messages.push({ id: '2', role: 'you', text: 'Second' })
    const store = { activeId: a.id, threads: [a, b] }
    expect(switchChat(store, b.id).activeId).toBe(b.id)
  })

  it('persists and reloads store including custom titles', () => {
    const t = createEmptyThread(opener)
    t.messages.push({ id: '1', role: 'you', text: 'Hello Freya' })
    let store = { activeId: t.id, threads: [t] }
    store = renameChat(store, t.id, 'My saved chat')
    saveFreyaChatStore('org-1', store)
    expect(localStorage.getItem(freyaChatStoreKey('org-1'))).toBeTruthy()
    const loaded = loadFreyaChatStore('org-1', opener)
    expect(loaded.threads[0].title).toBe('My saved chat')
    expect(loaded.threads[0].titleCustom).toBe(true)
  })
})
