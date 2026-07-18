import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, GripHorizontal, MessageCircle, Send, X } from 'lucide-react'
import { FreyaAvatar } from './FreyaAvatar'
import { FreyaActivityFeed } from './FreyaActivityFeed'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { useInbox } from '../context/InboxContext'
import { useMoney } from '../context/MoneyContext'
import { useApp } from '../context/AppContext'
import { parseFreyaIntent } from '../lib/freyaIntents'
import { audienceWord } from '../data/planTiers'

type ChatMsg = { id: string; role: 'freya' | 'you'; text: string }

const SUGGESTIONS_STARTER = [
  'Approve what’s waiting',
  'Draft a post',
  'Check messages',
  'Open Customers',
]

const SUGGESTIONS_GROWTH = [
  'Approve what’s waiting',
  'Draft a post',
  'Plan a campaign',
  'Show interested people',
]

const SUGGESTIONS_SCALE = [
  'Approve what’s waiting',
  'Draft a post',
  'Show overdue invoices',
  'Open Team',
]

const FAB_POS_KEY = 'antarious-freya-fab-pos-v1'
const FAB_W = 168
const FAB_H = 56
const FAB_W_STARTER = 200
const FAB_H_STARTER = 68
const MARGIN = 16

type FabPos = { x: number; y: number }

function fabSize(starter: boolean) {
  return starter ? { w: FAB_W_STARTER, h: FAB_H_STARTER } : { w: FAB_W, h: FAB_H }
}

function defaultPos(starter = false): FabPos {
  if (typeof window === 'undefined') return { x: 24, y: 24 }
  const { w, h } = fabSize(starter)
  return {
    x: Math.max(MARGIN, window.innerWidth - w - 24),
    y: Math.max(MARGIN, window.innerHeight - h - 24),
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
  const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN)
  return {
    x: Math.min(maxX, Math.max(MARGIN, pos.x)),
    y: Math.min(maxY, Math.max(MARGIN, pos.y)),
  }
}

export function AskFreya() {
  const navigate = useNavigate()
  const { profile, prefs, startTour, planTier, spendAiCredits, aiCreditsRemaining } = useApp()
  const isStarter = planTier === 'starter'
  const {
    panelOpen,
    panelTab,
    openPanel,
    closePanel,
    setPanelTab,
    waitingCount,
    approveAll,
  } = useFreyaActivity()
  const { approveAllDrafts } = useInbox()
  const { overdueInvoices } = useMoney()
  const owner = profile?.ownerName || 'there'
  const biz = profile?.businessName || 'your business'
  const people = audienceWord(profile?.customers, profile?.industry, profile?.audienceServe)

  const suggestions =
    planTier === 'scale'
      ? SUGGESTIONS_SCALE
      : planTier === 'growth'
        ? SUGGESTIONS_GROWTH
        : SUGGESTIONS_STARTER

  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: 'c0',
      role: 'freya',
      text: `Hey ${owner}! Just tell me what you need — approve what’s waiting, draft a post for your ${people}, check messages, or look at money for ${biz}.`,
    },
  ])
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState<FabPos>(() => loadPos(false))
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    setPos((p) => clampPos(p, isStarter))
  }, [isStarter])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, panelOpen, panelTab])

  useEffect(() => {
    function onResize() {
      setPos((p) => clampPos(p, isStarter))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isStarter])

  function runIntent(text: string) {
    if (!spendAiCredits(1)) {
      return `I'm out of AI credits for now (${aiCreditsRemaining} left). Grab a pack in Settings — Boost is $5 for 1,000 credits — or wait for next month's allowance.`
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

    if (result.navigate) {
      navigate(result.navigate, { state: result.navigateState ?? null })
    }

    return result.reply
  }

  function send(e?: FormEvent, preset?: string) {
    e?.preventDefault()
    const text = (preset ?? draft).trim()
    if (!text) return
    const you: ChatMsg = { id: `u${Date.now()}`, role: 'you', text }
    const replyText = runIntent(text)
    const reply: ChatMsg = { id: `f${Date.now() + 1}`, role: 'freya', text: replyText }
    setMessages((prev) => [...prev, you, reply])
    setDraft('')
  }

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
    openPanel(isStarter ? 'chat' : waitingCount > 0 ? 'activity' : 'chat')
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={onFabPointerUp}
        onPointerCancel={onFabPointerUp}
        className={`freya-fab-bob fixed z-40 flex touch-none items-center gap-3 rounded-full bg-gradient-to-r from-sky via-sky-bright to-teal-400 text-left text-white shadow-xl shadow-sky/40 ring-2 ring-white/50 select-none ${
          isStarter ? 'px-5 py-3.5' : 'px-4 py-2.5'
        } ${dragging ? 'dragging scale-105 cursor-grabbing' : 'cursor-grab hover:brightness-105'}`}
        style={{ left: pos.x, top: pos.y }}
        title="Drag to move · tap to talk"
      >
        <GripHorizontal className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 text-white/50" />
        <div className="relative">
          <FreyaAvatar size={isStarter ? 44 : 36} online />
          {waitingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sunshine px-1 text-[10px] font-bold text-navy-deep ring-2 ring-sky">
              {waitingCount}
            </span>
          )}
        </div>
        <div>
          <div className={`leading-tight font-bold ${isStarter ? 'text-[15px]' : 'text-[13px]'}`}>
            {isStarter ? 'Talk to Freya' : 'Ask Freya'}
          </div>
          <div className={`text-white/90 ${isStarter ? 'text-[12px]' : 'text-[11px]'}`}>
            {waitingCount > 0
              ? `${waitingCount} need your OK`
              : isStarter
                ? 'Just say what you need'
                : 'Drag me · tap to chat'}
          </div>
        </div>
      </button>

      {panelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-navy-deep/25 p-4 backdrop-blur-[3px] sm:p-6"
          onClick={closePanel}
        >
          <div
            className="flex h-[min(640px,88vh)] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-sky/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-navy-mid via-[#16324a] to-[#0e7490] px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <FreyaAvatar size={36} online />
                <div>
                  <div className="text-sm font-bold">Freya</div>
                  <div className="text-[11px] text-online">● Online · your AI teammate</div>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-1.5 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex shrink-0 gap-1 border-b border-sky/10 bg-gradient-to-r from-sky-soft/80 to-amber-50/60 px-2 py-1.5">
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
                <div
                  ref={listRef}
                  className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-sky-soft/40 to-page p-4"
                >
                  {messages.map((m) =>
                    m.role === 'freya' ? (
                      <div key={m.id} className="flex gap-2">
                        <FreyaAvatar size={28} />
                        <div className="max-w-[80%] rounded-2xl border border-sky/15 bg-white px-3.5 py-2.5 text-[13px] text-ink shadow-sm">
                          {m.text}
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-gradient-to-r from-sky to-teal-400 px-3.5 py-2.5 text-[13px] text-white shadow-sm">
                          {m.text}
                        </div>
                      </div>
                    ),
                  )}
                  {messages.length < 3 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(undefined, s)}
                          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-sky shadow-sm ring-1 ring-sky/20 hover:bg-sky-soft"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <form onSubmit={send} className="flex gap-2 border-t border-sky/10 bg-white p-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Just say what you need…"
                    className="h-11 flex-1 rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-teal-400 text-white hover:brightness-105 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="min-h-0 flex-1">
                <FreyaActivityFeed onNavigated={closePanel} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
