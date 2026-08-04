import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  Compass,
  Inbox,
  Sparkles,
  X,
} from 'lucide-react'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { useInbox } from '../context/InboxContext'
import { useDiscover } from '../context/DiscoverContext'
import { AREA_LABEL, type FreyaActivityItem } from '../data/freyaActivityData'

const SEEN_KEY = 'antarious-notif-seen-v1'

type Notif = {
  id: string
  title: string
  detail: string
  time: string
  href?: string
  tone: 'action' | 'info' | 'signal'
  freyaId?: string
}

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function saveSeen(ids: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]))
}

function buildNotifs(
  items: FreyaActivityItem[],
  unreadCount: number,
  newSignalCount: number,
): Notif[] {
  const waiting = items
    .filter((i) => i.status === 'waiting')
    .map((i) => ({
      id: `fa-${i.id}`,
      title: i.title,
      detail: i.detail,
      time: i.time,
      href: i.href,
      tone: 'action' as const,
      freyaId: i.id,
    }))

  const working = items
    .filter((i) => i.status === 'working')
    .map((i) => ({
      id: `fa-${i.id}`,
      title: i.title,
      detail: i.detail,
      time: i.time,
      href: i.href,
      tone: 'info' as const,
      freyaId: i.id,
    }))

  const extras: Notif[] = []
  if (unreadCount > 0) {
    extras.push({
      id: 'inbox-unread',
      title: `${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`,
      detail: 'Freya drafted replies — review in Messages.',
      time: 'Now',
      href: '/app/inbox',
      tone: 'action',
    })
  }
  if (newSignalCount > 0) {
    extras.push({
      id: 'discover-new',
      title: `${newSignalCount} new idea${newSignalCount === 1 ? '' : 's'} from Freya`,
      detail: 'Warm opportunities Freya spotted for you.',
      time: 'Today',
      href: '/app/discover',
      tone: 'signal',
    })
  }

  return [...waiting, ...extras, ...working]
}

export function NotificationBell() {
  const navigate = useNavigate()
  const { items, waitingCount, approve, approveAll, openPanel } = useFreyaActivity()
  const { unreadCount } = useInbox()
  const { newSignalCount } = useDiscover()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen())
  const rootRef = useRef<HTMLDivElement>(null)

  const notifs = useMemo(
    () => buildNotifs(items, unreadCount, newSignalCount),
    [items, unreadCount, newSignalCount],
  )

  const unreadNotifs = notifs.filter((n) => !seen.has(n.id))
  const badge = unreadNotifs.length

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function markSeen(ids: string[]) {
    setSeen((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      saveSeen(next)
      return next
    })
  }

  function markAllRead() {
    markSeen(notifs.map((n) => n.id))
  }

  function toggleOpen() {
    setOpen((v) => {
      const next = !v
      if (next) markSeen(notifs.map((n) => n.id))
      return next
    })
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
          open
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-400/40'
            : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-400/30 hover:brightness-110 hover:scale-105'
        }`}
        aria-label="Notifications"
        aria-expanded={open}
        title="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-sunshine px-1 text-[10px] font-bold text-navy-deep ring-2 ring-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+10px)] right-0 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-2xl shadow-sky/15">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-soft/80 to-amber-50/50 px-4 py-3">
            <div>
              <div className="text-[14px] font-bold text-ink">Notifications</div>
              <div className="text-[11px] text-muted">
                {waitingCount > 0
                  ? `${waitingCount} need your OK`
                  : 'You’re caught up with Freya'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {notifs.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-lg px-2 py-1 text-[11px] font-bold text-sky hover:bg-white"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(420px,60vh)] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Sparkles className="mx-auto mb-2 h-7 w-7 text-sky" />
                <p className="text-[13px] font-semibold text-ink">All quiet</p>
                <p className="mt-1 text-[12px] text-muted">
                  Freya will ping you when something needs a look.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifs.map((n) => {
                  const isUnread = !seen.has(n.id)
                  return (
                    <li
                      key={n.id}
                      className={`px-3 py-3 transition ${isUnread ? 'bg-sky-soft/30' : 'bg-white'}`}
                    >
                      <div className="flex gap-2.5">
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            n.tone === 'action'
                              ? 'bg-amber-100 text-amber-600'
                              : n.tone === 'signal'
                                ? 'bg-teal-100 text-teal-600'
                                : 'bg-sky-soft text-sky'
                          }`}
                        >
                          {n.id.startsWith('inbox') ? (
                            <Inbox className="h-3.5 w-3.5" />
                          ) : n.id.startsWith('discover') ? (
                            <Compass className="h-3.5 w-3.5" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 text-[13px] leading-snug font-bold text-ink">
                              {n.title}
                            </p>
                            {isUnread && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky" />
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] leading-snug text-muted">{n.detail}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span>{n.time}</span>
                            {n.freyaId && (
                              <span className="font-semibold text-slate-500">
                                {AREA_LABEL[items.find((i) => i.id === n.freyaId)?.area || 'content']}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {n.freyaId && items.find((i) => i.id === n.freyaId)?.status === 'waiting' && (
                              <button
                                type="button"
                                onClick={() => {
                                  approve(n.freyaId!)
                                  markSeen([n.id])
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-sky px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-bright"
                              >
                                <Check className="h-3 w-3" strokeWidth={3} />
                                Approve
                              </button>
                            )}
                            {n.href && (
                              <button
                                type="button"
                                onClick={() => {
                                  markSeen([n.id])
                                  setOpen(false)
                                  navigate(n.href!)
                                }}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                              >
                                Open
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5">
            {waitingCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  approveAll()
                  markAllRead()
                }}
                className="rounded-full bg-sky px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-sky/25 hover:bg-sky-bright"
              >
                Approve all waiting
              </button>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  openPanel('activity')
                }}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-bright to-sky px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-sky/30 hover:brightness-105"
              >
                Freya Activity →
              </button>
              <Link
                to="/app"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-white hover:text-ink"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
