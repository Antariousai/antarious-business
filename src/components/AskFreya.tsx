import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  GripHorizontal,
  History,
  MessageCircle,
  Pencil,
  SquarePen,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { FreyaAvatar } from './FreyaAvatar'
import { FreyaActivityFeed } from './FreyaActivityFeed'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { useInbox } from '../context/InboxContext'
import { useMoney } from '../context/MoneyContext'
import { useContent } from '../context/ContentContext'
import { useLeads } from '../context/LeadsContext'
import { useCampaigns } from '../context/CampaignsContext'
import { useCrm } from '../context/CrmContext'
import { useApp } from '../context/AppContext'
import { parseFreyaIntent } from '../lib/freyaIntents'
import { audienceWord, canAccessModule, type AppModule } from '../data/planTiers'
import { useBackendMode } from '@/lib/backend/BackendModeContext'
import {
  approveFreyaActivities,
  streamFreyaChat,
  splitFreyaReply,
  type FreyaOutputCard,
  type FreyaRefreshModule,
} from '@/lib/backend/freyaChat'
import { rememberUser } from '@/lib/rememberedUser'
import {
  deleteChat,
  formatThreadTime,
  loadFreyaChatStore,
  renameChat,
  saveFreyaChatStore,
  startNewChat,
  switchChat,
  threadHasUserContent,
  upsertActiveThread,
  type FreyaChatStore,
  type FreyaStoredMsg,
} from '@/lib/freyaChatThreads'
import { loadFreyaAskMode } from '@/lib/freyaAskHandoff'

type ChatMsg = {
  id: string
  role: 'freya' | 'you'
  text: string
  /** Live status while Freya is working (not persisted long-term). */
  status?: string
  working?: boolean
  cards?: FreyaOutputCard[]
  followUp?: string
}

/** Module-focused chips — filtered by plan entitlements. */
const SUGGESTION_CHIPS: { label: string; module: AppModule | null }[] = [
  { label: 'Approve what’s waiting', module: null },
  { label: 'Draft a post', module: 'posts' },
  { label: 'Reply to latest message', module: 'messages' },
  { label: 'Create a lead', module: 'leads' },
  { label: 'Draft an invoice', module: 'money' },
  { label: 'Plan a campaign', module: 'campaigns' },
]

const FAB_POS_KEY = 'antarious-freya-fab-pos-v1'
const PANEL_SIZE_KEY = 'antarious-freya-panel-size-v1'
/** Solid circular Freya button */
const FAB_SIZE = 60
const FAB_SIZE_STARTER = 64
const MARGIN = 16
const PANEL_MIN_W = 300
const PANEL_MIN_H = 360
const PANEL_DEFAULT_W = 400
const PANEL_DEFAULT_H = 560

type FabPos = { x: number; y: number }
type PanelSize = { w: number; h: number }
type PanelGeom = { x: number; y: number; w: number; h: number }

function openerMessage(owner: string, biz: string, people: string, canCampaigns: boolean): ChatMsg {
  const extras = canCampaigns
    ? `create a lead, draft an invoice, or plan a campaign for ${biz}`
    : `create a lead or draft an invoice for ${biz}`
  return {
    id: 'c0',
    role: 'freya',
    text: `Hey ${owner}! Just tell me what you need — draft a post for your ${people}, reply to messages, ${extras}.`,
  }
}

function toStoredMessages(messages: ChatMsg[]): FreyaStoredMsg[] {
  return messages
    .filter((m) => !m.working && (m.text?.trim() || m.cards?.length || m.followUp))
    .map(({ working: _w, status: _s, ...rest }) => ({
      id: rest.id,
      role: rest.role,
      text: rest.text,
      cards: rest.cards,
      followUp: rest.followUp,
    }))
}

function fromStoredMessages(stored: FreyaStoredMsg[]): ChatMsg[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    text: m.text,
    cards: Array.isArray(m.cards) ? (m.cards as FreyaOutputCard[]) : undefined,
    followUp: m.followUp,
    working: false,
    status: undefined,
  }))
}

function fabSize(starter: boolean) {
  const s = starter ? FAB_SIZE_STARTER : FAB_SIZE
  return { w: s, h: s }
}

function mobileTabInset() {
  if (typeof window === 'undefined') return 0
  return window.matchMedia('(min-width: 1024px)').matches ? 0 : 72
}

function defaultPos(starter = false): FabPos {
  if (typeof window === 'undefined') return { x: 24, y: 24 }
  const { w, h } = fabSize(starter)
  const bottom = 24 + mobileTabInset()
  return {
    x: Math.max(MARGIN, window.innerWidth - w - 24),
    y: Math.max(MARGIN, window.innerHeight - h - bottom),
  }
}

function loadPos(starter = false): FabPos {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY)
    if (!raw) return defaultPos(starter)
    const parsed = JSON.parse(raw) as FabPos
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return defaultPos(starter)
    return clampPos(parsed, starter)
  } catch {
    return defaultPos(starter)
  }
}

function clampPos(pos: FabPos, starter = false): FabPos {
  const { w, h } = fabSize(starter)
  const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN - mobileTabInset())
  return {
    x: Math.min(maxX, Math.max(MARGIN, pos.x)),
    y: Math.min(maxY, Math.max(MARGIN, pos.y)),
  }
}

function loadPanelSize(): PanelSize {
  try {
    const raw = localStorage.getItem(PANEL_SIZE_KEY)
    if (!raw) return { w: PANEL_DEFAULT_W, h: PANEL_DEFAULT_H }
    const parsed = JSON.parse(raw) as PanelSize
    if (typeof parsed.w !== 'number' || typeof parsed.h !== 'number') {
      return { w: PANEL_DEFAULT_W, h: PANEL_DEFAULT_H }
    }
    return {
      w: Math.min(Math.max(PANEL_MIN_W, parsed.w), Math.max(PANEL_MIN_W, window.innerWidth - MARGIN * 2)),
      h: Math.min(Math.max(PANEL_MIN_H, parsed.h), Math.max(PANEL_MIN_H, window.innerHeight - MARGIN * 2)),
    }
  } catch {
    return { w: PANEL_DEFAULT_W, h: PANEL_DEFAULT_H }
  }
}

function clampPanelGeom(g: PanelGeom): PanelGeom {
  if (typeof window === 'undefined') return g
  const maxW = Math.max(PANEL_MIN_W, window.innerWidth - MARGIN * 2)
  const maxH = Math.max(PANEL_MIN_H, window.innerHeight - MARGIN * 2 - mobileTabInset())
  const w = Math.min(maxW, Math.max(PANEL_MIN_W, g.w))
  const h = Math.min(maxH, Math.max(PANEL_MIN_H, g.h))
  const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN - mobileTabInset())
  return {
    w,
    h,
    x: Math.min(maxX, Math.max(MARGIN, g.x)),
    y: Math.min(maxY, Math.max(MARGIN, g.y)),
  }
}

/** Open panel anchored to the Freya button’s current spot. */
function panelGeomAtFab(fab: FabPos, starter: boolean, size: PanelSize): PanelGeom {
  const { w: fw, h: fh } = fabSize(starter)
  const fabRight = fab.x + fw
  const fabBottom = fab.y + fh
  // Prefer opening above the button, right edges aligned with the FAB.
  let x = fabRight - size.w
  let y = fab.y - size.h - 10
  // If no room above, open to the left of the button at the same vertical band.
  if (y < MARGIN) {
    y = Math.max(MARGIN, fab.y + fh / 2 - size.h / 2)
    x = fab.x - size.w - 10
  }
  // Still clipped? Fall back so the panel covers the FAB location.
  if (x < MARGIN) {
    x = Math.max(MARGIN, fabRight - size.w)
    y = Math.max(MARGIN, Math.min(fabBottom - size.h, window.innerHeight - size.h - MARGIN))
  }
  return clampPanelGeom({ x, y, w: size.w, h: size.h })
}

function wantsApproveAll(text: string) {
  const t = text.toLowerCase()
  return (
    t.includes('approve what’s waiting') ||
    t.includes("approve what's waiting") ||
    t.includes('approve whats waiting') ||
    t.includes('approve all') ||
    (t.includes('approve') && t.includes('waiting'))
  )
}

function FreyaTurn({
  message,
  onOpenPath,
}: {
  message: ChatMsg
  onOpenPath: (path: string) => void
}) {
  const showBody = Boolean(message.text?.trim())
  const cards = message.cards ?? []
  const followUp = message.followUp?.trim()

  return (
    <div className="flex gap-2">
      <FreyaAvatar size={28} />
      <div className="flex min-w-0 max-w-[85%] flex-col gap-2">
        {message.working && (
          <div className="freya-status-line rounded-2xl border border-sky/20 bg-sky-soft/70 px-3.5 py-2.5 text-[12px] font-medium text-sky">
            <span className="freya-status-dot" aria-hidden />
            <span>{message.status || 'Working on it…'}</span>
          </div>
        )}

        {showBody && (
          <div className="rounded-2xl border border-sky/15 bg-white px-3.5 py-2.5 text-[13px] text-ink shadow-sm whitespace-pre-wrap">
            {message.text}
          </div>
        )}

        {cards.map((card) => (
          <div
            key={card.id}
            className="overflow-hidden rounded-2xl border border-sky/20 bg-white shadow-sm"
          >
            <div className="border-b border-sky/10 bg-gradient-to-r from-sky-soft/80 to-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-sky">
              {card.title}
            </div>
            <div className="px-3.5 py-2.5 text-[13px] leading-relaxed text-ink whitespace-pre-wrap">
              {card.body}
            </div>
            {(card.meta || card.path) && (
              <div className="flex items-center justify-between gap-2 border-t border-sky/10 px-3 py-1.5 text-[11px] text-slate-500">
                <span className="truncate">{card.meta}</span>
                {card.path && (
                  <button
                    type="button"
                    onClick={() => onOpenPath(card.path!)}
                    className="shrink-0 font-semibold text-sky hover:underline"
                  >
                    Open
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {followUp && !message.working && (
          <div className="rounded-2xl border border-dashed border-teal-300/60 bg-teal-50/50 px-3.5 py-2.5 text-[13px] text-ink">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal-700/80">
              Follow-up
            </div>
            <div className="whitespace-pre-wrap">{followUp}</div>
          </div>
        )}

        {!message.working && !showBody && !cards.length && !followUp && (
          <div className="rounded-2xl border border-sky/15 bg-white px-3.5 py-2.5 text-[13px] text-ink shadow-sm">
            Done.
          </div>
        )}
      </div>
    </div>
  )
}

export function AskFreya() {
  const navigate = useNavigate()
  const { backend } = useBackendMode()
  const {
    profile,
    prefs,
    startTour,
    planTier,
    spendAiCredits,
    aiCreditsRemaining,
    organizationId,
    canAccess,
    canAccessRoute,
    hydrated,
    hydrateFromBackend,
  } = useApp()
  const isStarter = planTier === 'starter'
  const {
    panelOpen,
    panelTab,
    openPanel,
    closePanel,
    setPanelTab,
    waitingCount,
    approveAll,
    refresh: refreshActivity,
    chatHandoff,
    clearChatHandoff,
  } = useFreyaActivity()
  const { approveAllDrafts, refresh: refreshInbox } = useInbox()
  const { overdueInvoices, refresh: refreshMoney } = useMoney()
  const { refresh: refreshContent } = useContent()
  const { refresh: refreshLeads } = useLeads()
  const { refresh: refreshCampaigns } = useCampaigns()
  const { refresh: refreshCrm } = useCrm()
  const owner = profile?.ownerName || 'there'
  const biz = profile?.businessName || 'your business'
  const people = audienceWord(profile?.customers, profile?.industry, profile?.audienceServe)

  const suggestions = SUGGESTION_CHIPS.filter(
    (c) => !c.module || canAccessModule(planTier, c.module),
  ).map((c) => c.label)

  const chatKeyRef = useRef<string | null>(null)
  const chatStoreRef = useRef<FreyaChatStore | null>(null)
  const [chatStore, setChatStore] = useState<FreyaChatStore | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    openerMessage(owner, biz, people, canAccessModule(planTier, 'campaigns')),
  ])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [pos, setPos] = useState<FabPos>(() => loadPos(false))
  const [dragging, setDragging] = useState(false)
  const [panelGeom, setPanelGeom] = useState<PanelGeom>(() => {
    const size = typeof window !== 'undefined' ? loadPanelSize() : { w: PANEL_DEFAULT_W, h: PANEL_DEFAULT_H }
    return { x: 24, y: 24, ...size }
  })
  const [panelDragging, setPanelDragging] = useState(false)
  const [panelResizing, setPanelResizing] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const panelDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const panelResizeRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originW: number
    originH: number
    originX: number
    originY: number
  } | null>(null)

  // Load persisted chat threads once org (or local demo) is known.
  useEffect(() => {
    if (!hydrated) return
    const key = `org:${organizationId || 'local'}`
    if (chatKeyRef.current === key) return
    chatKeyRef.current = key
    const opener = openerMessage(owner, biz, people, canAccess('campaigns'))
    const store = loadFreyaChatStore(organizationId, opener)
    chatStoreRef.current = store
    setChatStore(store)
    const active = store.threads.find((t) => t.id === store.activeId) || store.threads[0]
    setMessages(fromStoredMessages(active.messages))
    setHistoryOpen(false)
  }, [hydrated, organizationId, owner, biz, people, canAccess])

  useEffect(() => {
    if (!hydrated || !chatKeyRef.current) return
    const store = chatStoreRef.current
    if (!store) return
    const slim = toStoredMessages(messages)
    const cur = store.threads.find((t) => t.id === store.activeId)
    if (cur && JSON.stringify(cur.messages) === JSON.stringify(slim)) return
    const next = upsertActiveThread(store, slim)
    chatStoreRef.current = next
    saveFreyaChatStore(organizationId, next)
    setChatStore(next)
  }, [messages, organizationId, hydrated])

  function makeOpener() {
    return openerMessage(owner, biz, people, canAccess('campaigns'))
  }

  function commitStore(next: FreyaChatStore) {
    chatStoreRef.current = next
    saveFreyaChatStore(organizationId, next)
    setChatStore(next)
  }

  function onNewChat() {
    if (sending) return
    abortRef.current?.abort()
    const opener = makeOpener()
    const base = chatStoreRef.current || loadFreyaChatStore(organizationId, opener)
    const withMsgs = upsertActiveThread(base, toStoredMessages(messages))
    const next = startNewChat(withMsgs, opener)
    commitStore(next)
    setMessages(fromStoredMessages(next.threads.find((t) => t.id === next.activeId)!.messages))
    setHistoryOpen(false)
    setDraft('')
    setPanelTab('chat')
  }

  function onSelectThread(threadId: string) {
    if (sending || !chatStoreRef.current || threadId === chatStoreRef.current.activeId) {
      setHistoryOpen(false)
      return
    }
    abortRef.current?.abort()
    const withMsgs = upsertActiveThread(chatStoreRef.current, toStoredMessages(messages))
    const next = switchChat(withMsgs, threadId)
    commitStore(next)
    const active = next.threads.find((t) => t.id === next.activeId)
    if (active) setMessages(fromStoredMessages(active.messages))
    setHistoryOpen(false)
    setDraft('')
    setPanelTab('chat')
  }

  function onDeleteThread(threadId: string, e: MouseEvent) {
    e.stopPropagation()
    if (sending) return
    if (editingThreadId === threadId) {
      setEditingThreadId(null)
      setEditingTitle('')
    }
    const opener = makeOpener()
    const base = chatStoreRef.current || loadFreyaChatStore(organizationId, opener)
    const withMsgs =
      threadId === base.activeId ? upsertActiveThread(base, toStoredMessages(messages)) : base
    const next = deleteChat(withMsgs, threadId, opener)
    commitStore(next)
    if (threadId === base.activeId) {
      const active = next.threads.find((t) => t.id === next.activeId)
      if (active) setMessages(fromStoredMessages(active.messages))
    }
  }

  function beginRename(threadId: string, currentTitle: string, e: MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setEditingThreadId(threadId)
    setEditingTitle(currentTitle || '')
  }

  function commitRename(threadId: string) {
    const opener = makeOpener()
    const base = chatStoreRef.current || loadFreyaChatStore(organizationId, opener)
    const next = renameChat(base, threadId, editingTitle)
    commitStore(next)
    setEditingThreadId(null)
    setEditingTitle('')
  }

  function cancelRename() {
    setEditingThreadId(null)
    setEditingTitle('')
  }

  const historyThreads = (chatStore?.threads || [])
    .filter((t) => threadHasUserContent(t.messages) || t.id === chatStore?.activeId)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  useEffect(() => {
    setPos((p) => clampPos(p, isStarter))
  }, [isStarter])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, panelOpen, panelTab])

  useEffect(() => {
    function onResize() {
      setPos((p) => clampPos(p, isStarter))
      setPanelGeom((g) => clampPanelGeom(g))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isStarter])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  function openAtFab(tab: 'chat' | 'activity') {
    openPanel(tab)
  }

  // Whenever the panel opens (FAB, TopBar, Home…), place it at the Freya button.
  const panelWasOpen = useRef(false)
  useEffect(() => {
    if (!panelOpen) {
      panelWasOpen.current = false
      return
    }
    if (panelWasOpen.current) return
    panelWasOpen.current = true
    setPanelGeom((g) => panelGeomAtFab(pos, isStarter, { w: g.w, h: g.h }))
  }, [panelOpen, pos, isStarter])

  async function refreshAfterTools(modules?: FreyaRefreshModule[]) {
    const set = new Set(modules?.length ? modules : (['activity'] as FreyaRefreshModule[]))
    const jobs: Promise<unknown>[] = []
    if (set.has('activity')) jobs.push(refreshActivity())
    if (set.has('content') && canAccess('posts')) jobs.push(refreshContent())
    if (set.has('inbox') && canAccess('messages')) jobs.push(refreshInbox())
    if (set.has('leads') && canAccess('leads')) jobs.push(refreshLeads())
    if (set.has('campaigns') && canAccess('campaigns')) jobs.push(refreshCampaigns())
    if (set.has('money') && canAccess('money')) jobs.push(refreshMoney())
    if (set.has('crm') && canAccess('customers')) jobs.push(refreshCrm())
    if (set.has('profile')) {
      jobs.push(
        hydrateFromBackend().then((me) => {
          if (me?.profile?.ownerName) {
            rememberUser({
              name: me.profile.ownerName,
              email: undefined,
            })
          }
        }),
      )
    }
    await Promise.allSettled(jobs)
  }

  function runIntent(text: string) {
    if (!spendAiCredits(1)) {
      return `I'm out of AI credits for now (${aiCreditsRemaining} left). Grab a pack in Settings — Boost is ৳499 for 1,000 credits — or wait for next month's allowance.`
    }

    const result = parseFreyaIntent(text, {
      waitingCount,
      overdueCount: overdueInvoices.length,
      ownerName: owner,
      businessName: biz,
      tone: prefs.tone,
      customers: profile?.customers,
      industry: profile?.industry,
      audienceServe: profile?.audienceServe,
      planTier,
    })

    for (const action of result.actions || []) {
      if (action === 'approveAll') approveAll()
      if (action === 'approveInbox') approveAllDrafts()
      if (action === 'openTour') startTour()
      if (action === 'openActivity') setPanelTab('activity')
      if (action === 'closePanel') closePanel()
    }

    if (result.navigate && canAccessRoute(result.navigate)) {
      navigate(result.navigate, { state: result.navigateState ?? null })
    }

    return result.reply
  }

  async function sendBackend(text: string, history: ChatMsg[]) {
    const replyId = `f${Date.now() + 1}`
    setMessages((prev) => [
      ...prev,
      {
        id: replyId,
        role: 'freya',
        text: '',
        working: true,
        status: 'Looking at what you need…',
      },
    ])

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      if (wantsApproveAll(text)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId ? { ...m, status: 'Approving what’s waiting…' } : m,
          ),
        )
        await approveFreyaActivities({ approveAll: true })
        approveAllDrafts()
        await refreshAfterTools([
          'activity',
          'content',
          'inbox',
          'leads',
          'campaigns',
          'money',
          'crm',
        ])
      }

      const result = await streamFreyaChat(
        history,
        {
          onStatus: (status) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === replyId ? { ...m, working: true, status } : m)),
            )
          },
          onDelta: (partial) => {
            const split = splitFreyaReply(partial)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === replyId
                  ? {
                      ...m,
                      working: true,
                      status: m.status || 'Writing your reply…',
                      text: split.body || partial,
                      followUp: split.followUp,
                    }
                  : m,
              ),
            )
          },
        },
        ac.signal,
      )

      const split = splitFreyaReply(result.text || 'Done.')
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyId
            ? {
                ...m,
                working: false,
                status: undefined,
                text: result.text || split.body || 'Done.',
                followUp: result.followUp ?? split.followUp,
                cards: result.cards,
              }
            : m,
        ),
      )

      await refreshAfterTools(result.refreshModules)

      if (result.openActivity) setPanelTab('activity')
      if (result.navigatePath && canAccessRoute(result.navigatePath)) {
        navigate(result.navigatePath, {
          state: result.focusPostId
            ? { focusPostId: result.focusPostId, tab: 'feed' as const }
            : undefined,
        })
        if (!result.navigatePath.startsWith('/app/settings')) {
          closePanel()
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      const message =
        err instanceof Error ? err.message : 'Something went wrong talking to Freya.'
      if (/failed to fetch|network|401|403/i.test(message)) {
        const replyText = runIntent(text)
        const split = splitFreyaReply(replyText)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  working: false,
                  status: undefined,
                  text: split.body || replyText,
                  followUp: split.followUp,
                }
              : m,
          ),
        )
        return
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyId
            ? {
                ...m,
                working: false,
                status: undefined,
                text:
                  message.includes('credits') || message.includes('CREDITS')
                    ? `I'm out of AI credits (${aiCreditsRemaining} left). Grab a pack in Settings.`
                    : message,
              }
            : m,
        ),
      )
    }
  }

  function send(e?: FormEvent, preset?: string) {
    e?.preventDefault()
    const text = (preset ?? draft).trim()
    if (!text || sending) return
    const you: ChatMsg = { id: `u${Date.now()}`, role: 'you', text }
    setDraft('')

    if (backend) {
      setSending(true)
      const history = [...messages, you]
      setMessages(history)
      void sendBackend(text, history).finally(() => setSending(false))
      return
    }

    const replyText = runIntent(text)
    const split = splitFreyaReply(replyText)
    const reply: ChatMsg = {
      id: `f${Date.now() + 1}`,
      role: 'freya',
      text: split.body || replyText,
      followUp: split.followUp,
    }
    setMessages((prev) => [...prev, you, reply])
  }

  // Create/edit popups hand off into this chat (paste or auto-send per Settings).
  useEffect(() => {
    if (!chatHandoff?.prompt?.trim()) return
    const mode = chatHandoff.mode ?? loadFreyaAskMode()
    const text = chatHandoff.prompt.trim()
    clearChatHandoff()
    setHistoryOpen(false)
    setPanelTab('chat')
    if (mode === 'send') {
      window.setTimeout(() => send(undefined, text), 40)
    } else {
      setDraft(text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handoff is one-shot
  }, [chatHandoff])

  function onFabPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    }
    setDragging(true)
  }

  function onFabPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true
    if (!d.moved) return
    setPos(clampPos({ x: d.originX + dx, y: d.originY + dy }, isStarter))
  }

  function onFabPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    const wasDrag = d.moved
    dragRef.current = null
    setDragging(false)
    if (wasDrag) {
      setPos((p) => {
        const next = clampPos(p, isStarter)
        localStorage.setItem(FAB_POS_KEY, JSON.stringify(next))
        return next
      })
      return
    }
    openAtFab(isStarter ? 'chat' : waitingCount > 0 ? 'activity' : 'chat')
  }

  function onPanelHeaderPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    panelDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: panelGeom.x,
      originY: panelGeom.y,
    }
    setPanelDragging(true)
  }

  function onPanelHeaderPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = panelDragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    setPanelGeom((g) =>
      clampPanelGeom({
        ...g,
        x: d.originX + (e.clientX - d.startX),
        y: d.originY + (e.clientY - d.startY),
      }),
    )
  }

  function onPanelHeaderPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = panelDragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
    panelDragRef.current = null
    setPanelDragging(false)
    setPanelGeom((g) => clampPanelGeom(g))
  }

  function onResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    panelResizeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originW: panelGeom.w,
      originH: panelGeom.h,
      originX: panelGeom.x,
      originY: panelGeom.y,
    }
    setPanelResizing(true)
  }

  function onResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = panelResizeRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const nextW = d.originW + (e.clientX - d.startX)
    const nextH = d.originH + (e.clientY - d.startY)
    setPanelGeom(
      clampPanelGeom({
        x: d.originX,
        y: d.originY,
        w: nextW,
        h: nextH,
      }),
    )
  }

  function onResizePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = panelResizeRef.current
    if (!d || d.pointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
    panelResizeRef.current = null
    setPanelResizing(false)
    setPanelGeom((g) => {
      const next = clampPanelGeom(g)
      localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify({ w: next.w, h: next.h }))
      return next
    })
  }

  return (
    <>
      {!panelOpen && (
        <button
          type="button"
          onPointerDown={onFabPointerDown}
          onPointerMove={onFabPointerMove}
          onPointerUp={onFabPointerUp}
          onPointerCancel={onFabPointerUp}
          aria-label={
            waitingCount > 0
              ? `Ask Freya · ${waitingCount} need your OK`
              : 'Ask Freya'
          }
          title="Ask Freya · drag to move"
          className={`freya-fab-bob fixed z-40 flex touch-none items-center justify-center rounded-full bg-transparent select-none ${
            dragging
              ? 'dragging scale-105 cursor-grabbing'
              : 'cursor-grab hover:scale-[1.04]'
          }`}
          style={{
            left: pos.x,
            top: pos.y,
            width: fabSize(isStarter).w,
            height: fabSize(isStarter).h,
          }}
        >
          <div className="relative drop-shadow-[0_8px_20px_rgba(2,132,199,0.35)]">
            <FreyaAvatar
              size={isStarter ? 52 : 48}
              online
              className="!ring-2 !ring-white shadow-sm"
            />
            {waitingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sunshine px-1 text-[10px] font-bold text-navy-deep shadow-sm">
                {waitingCount > 9 ? '9+' : waitingCount}
              </span>
            )}
          </div>
        </button>
      )}

      {panelOpen && (
        <>
          <button
            type="button"
            aria-label="Close Freya"
            className="fixed inset-0 z-40 cursor-default bg-navy-deep/20 backdrop-blur-[2px]"
            onClick={closePanel}
          />
          <div
            className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-sky/15 ${
              panelDragging || panelResizing ? 'select-none' : ''
            }`}
            style={{
              left: panelGeom.x,
              top: panelGeom.y,
              width: panelGeom.w,
              height: panelGeom.h,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onPointerDown={onPanelHeaderPointerDown}
              onPointerMove={onPanelHeaderPointerMove}
              onPointerUp={onPanelHeaderPointerUp}
              onPointerCancel={onPanelHeaderPointerUp}
              className={`flex shrink-0 touch-none items-center justify-between bg-navy-mid px-4 py-3 text-white ${
                panelDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              title="Drag to move panel"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <GripHorizontal className="h-4 w-4 shrink-0 text-white/45" />
                <FreyaAvatar size={36} online />
                <div className="min-w-0">
                  <div className="text-sm font-bold">Freya</div>
                  <div className="truncate text-[11px] text-online">
                    ● {backend ? 'Online · workspace' : 'Online · demo'} · drag header · resize corner
                  </div>
                </div>
              </div>
              <div
                className="flex shrink-0 items-center gap-0.5"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setHistoryOpen((v) => !v)
                    setPanelTab('chat')
                  }}
                  disabled={sending}
                  className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-40"
                  aria-label={historyOpen ? 'Close chat history' : 'Chat history'}
                  title="Chat history"
                >
                  <History className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onNewChat()
                  }}
                  disabled={sending}
                  className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-40"
                  aria-label="New chat"
                  title="New chat"
                >
                  <SquarePen className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-lg p-1.5 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex shrink-0 gap-1 border-b border-sky/10 bg-sky-soft/50 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setPanelTab('chat')}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold transition ${
                  panelTab === 'chat'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate-500 hover:text-ink'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
              </button>
              <button
                type="button"
                onClick={() => setPanelTab('activity')}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold transition ${
                  panelTab === 'activity'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate-500 hover:text-ink'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Activity
                {waitingCount > 0 && (
                  <span className="rounded-full bg-sunshine px-1.5 text-[10px] text-navy-deep">
                    {waitingCount}
                  </span>
                )}
              </button>
            </div>

            {panelTab === 'chat' ? (
              <>
                {historyOpen ? (
                  <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none bg-page p-3">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Previous chats
                      </p>
                      <button
                        type="button"
                        onClick={onNewChat}
                        disabled={sending}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-bright disabled:opacity-50"
                      >
                        <SquarePen className="h-3 w-3" />
                        New chat
                      </button>
                    </div>
                    {historyThreads.length === 0 ? (
                      <p className="px-1 py-6 text-center text-[13px] text-slate-500">
                        No chats yet. Start one and it will show up here.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {historyThreads.map((t) => {
                          const active = t.id === chatStore?.activeId
                          const editing = editingThreadId === t.id
                          return (
                            <li key={t.id}>
                              <div
                                className={`group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                                  active
                                    ? 'bg-sky-soft ring-1 ring-sky/25'
                                    : 'bg-white ring-1 ring-slate-200/80 hover:bg-sky-soft/60'
                                }`}
                              >
                                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky" />
                                <div className="min-w-0 flex-1">
                                  {editing ? (
                                    <input
                                      autoFocus
                                      value={editingTitle}
                                      maxLength={48}
                                      onChange={(e) => setEditingTitle(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        e.stopPropagation()
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          commitRename(t.id)
                                        } else if (e.key === 'Escape') {
                                          e.preventDefault()
                                          cancelRename()
                                        }
                                      }}
                                      onBlur={() => commitRename(t.id)}
                                      className="w-full rounded-md border border-sky/40 bg-white px-2 py-1 text-[13px] font-semibold text-ink outline-none focus:ring-2 focus:ring-sky/20"
                                      aria-label="Rename chat"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onSelectThread(t.id)}
                                      disabled={sending}
                                      className="block w-full truncate text-left text-[13px] font-semibold text-ink disabled:opacity-50"
                                    >
                                      {t.title || 'New chat'}
                                    </button>
                                  )}
                                  <span className="mt-0.5 block text-[11px] text-slate-500">
                                    {formatThreadTime(t.updatedAt)}
                                    {active ? ' · Current' : ''}
                                    {t.titleCustom ? ' · Renamed' : ''}
                                  </span>
                                </div>
                                <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                  <button
                                    type="button"
                                    onClick={(e) => beginRename(t.id, t.title || 'New chat', e)}
                                    disabled={sending || editing}
                                    className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-sky disabled:opacity-40"
                                    aria-label="Rename chat"
                                    title="Rename"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => onDeleteThread(t.id, e)}
                                    disabled={sending}
                                    className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                                    aria-label="Delete chat"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div
                    ref={listRef}
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-none bg-page p-4"
                  >
                    {messages.map((m) =>
                      m.role === 'you' ? (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[80%] rounded-2xl bg-sky px-3.5 py-2.5 text-[13px] text-white shadow-sm whitespace-pre-wrap">
                            {m.text}
                          </div>
                        </div>
                      ) : (
                        <FreyaTurn
                          key={m.id}
                          message={m}
                          onOpenPath={(path) => {
                            if (canAccessRoute(path)) {
                              navigate(path)
                              closePanel()
                            }
                          }}
                        />
                      ),
                    )}
                    {messages.length < 3 && !sending && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => send(undefined, s)}
                            disabled={sending}
                            className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-sky shadow-sm ring-1 ring-sky/20 hover:bg-sky-soft disabled:opacity-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!historyOpen && (
                  <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-sky/10 bg-white p-3">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Just say what you need…"
                      disabled={sending}
                      className="h-11 flex-1 rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky text-white hover:bg-sky-bright disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="min-h-0 flex-1">
                <FreyaActivityFeed onNavigated={closePanel} />
              </div>
            )}

            <div
              onPointerDown={onResizePointerDown}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              onPointerCancel={onResizePointerUp}
              className={`absolute bottom-0 right-0 z-10 h-5 w-5 touch-none cursor-se-resize ${
                panelResizing ? 'bg-sky/20' : ''
              }`}
              title="Drag to resize"
              aria-label="Resize Freya panel"
            >
              <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-2.5 w-2.5 border-r-2 border-b-2 border-slate-400/70" />
            </div>
          </div>
        </>
      )}
    </>
  )
}
