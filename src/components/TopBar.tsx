import { Menu, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { useApp } from '../context/AppContext'
import { useState, type FormEvent } from 'react'
import { NotificationBell } from './NotificationBell'
import { SEARCH_ROUTES } from './navConfig'

export function TopBar({
  title,
  subtitle,
  onMenuClick,
}: {
  title: string
  subtitle?: string
  onMenuClick?: () => void
}) {
  const { waitingCount, openPanel } = useFreyaActivity()
  const { profile } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const biz = profile?.businessName

  function runSearch(raw: string) {
    const q = raw.trim().toLowerCase()
    if (!q) {
      openPanel('chat')
      return
    }
    const hit = SEARCH_ROUTES.find((r) => q.includes(r.q) || r.q.includes(q))
    if (hit) {
      if (hit.q === 'freya') openPanel(waitingCount > 0 ? 'activity' : 'chat')
      else navigate(hit.path)
      setQuery('')
      setSearchOpen(false)
      return
    }
    openPanel('chat')
    setQuery('')
    setSearchOpen(false)
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    runSearch(query)
  }

  return (
    <>
      <header className="relative z-30 flex items-center justify-between gap-3 overflow-visible border-b border-sky/10 bg-white/80 px-4 py-3 backdrop-blur-md sm:gap-6 sm:px-8 sm:py-4">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-soft/60 via-amber-50/40 to-transparent" />
        <div className="relative flex min-w-0 items-center gap-2">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="shrink-0 rounded-xl p-2 text-ink hover:bg-sky-soft/60 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-bold tracking-tight text-ink sm:text-[22px]">
              {title}
            </h1>
            <p className="hidden truncate text-[13px] text-muted sm:block">
              {subtitle ||
                (biz
                  ? `Freya's on it for ${biz} — here's what's happening`
                  : "Freya's on it — here's what's happening")}
            </p>
          </div>
        </div>
        <div className="relative z-20 flex items-center gap-2 sm:gap-3">
          <form onSubmit={onSearch} className="relative hidden md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-sky" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Freya or jump to Home, Posts, Messages…"
              className="h-10 w-72 rounded-full border border-sky/15 bg-white pr-4 pl-10 text-sm text-ink shadow-sm outline-none placeholder:text-neutral-400 focus:border-sky focus:ring-2 focus:ring-sky/25"
            />
          </form>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-xl p-2 text-sky-bright hover:bg-sky-soft/60 md:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
          <NotificationBell />
        </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-navy-deep/40"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 bg-white p-4 shadow-lg">
            <form onSubmit={onSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-sky" />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask Freya or jump…"
                  className="h-11 w-full rounded-full border border-sky/15 bg-white pr-4 pl-10 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/25"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-lg p-2 text-neutral-400"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
