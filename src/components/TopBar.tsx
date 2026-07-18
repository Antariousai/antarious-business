import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { useApp } from '../context/AppContext'
import { useState, type FormEvent } from 'react'
import { NotificationBell } from './NotificationBell'

const SEARCH_ROUTES: { q: string; path: string; label: string }[] = [
  { q: 'inbox', path: '/app/inbox', label: 'Messages' },
  { q: 'message', path: '/app/inbox', label: 'Messages' },
  { q: 'today', path: '/app', label: 'Today' },
  { q: 'home', path: '/app', label: 'Today' },
  { q: 'lead', path: '/app/leads', label: 'Interested people' },
  { q: 'interested', path: '/app/leads', label: 'Interested people' },
  { q: 'crm', path: '/app/pipeline', label: 'Customers' },
  { q: 'customer', path: '/app/pipeline', label: 'Customers' },
  { q: 'pipeline', path: '/app/pipeline', label: 'Customers' },
  { q: 'money', path: '/app/money', label: 'Money' },
  { q: 'invoice', path: '/app/money', label: 'Money' },
  { q: 'content', path: '/app/content', label: 'Posts' },
  { q: 'post', path: '/app/content', label: 'Posts' },
  { q: 'campaign', path: '/app/campaigns', label: 'Campaigns' },
  { q: 'discover', path: '/app/discover', label: 'Ideas' },
  { q: 'idea', path: '/app/discover', label: 'Ideas' },
  { q: 'template', path: '/app/templates', label: 'Templates' },
  { q: 'team', path: '/app/team', label: 'Team' },
  { q: 'setting', path: '/app/settings', label: 'Settings' },
  { q: 'profile', path: '/app/profile', label: 'Profile' },
  { q: 'freya', path: '/app', label: 'Freya' },
]

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { waitingCount, openPanel } = useFreyaActivity()
  const { profile } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const biz = profile?.businessName

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim().toLowerCase()
    if (!q) {
      openPanel('chat')
      return
    }
    const hit = SEARCH_ROUTES.find((r) => q.includes(r.q) || r.q.includes(q))
    if (hit) {
      if (hit.q === 'freya') openPanel(waitingCount > 0 ? 'activity' : 'chat')
      else navigate(hit.path)
      setQuery('')
      return
    }
    openPanel('chat')
    setQuery('')
  }

  return (
    <header className="relative z-30 flex items-center justify-between gap-6 overflow-visible border-b border-sky/10 bg-white/80 px-8 py-4 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-soft/60 via-amber-50/40 to-transparent" />
      <div className="relative min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">{title}</h1>
        <p className="text-[13px] text-muted">
          {subtitle ||
            (biz
              ? `Freya's on it for ${biz} — here's what's happening`
              : "Freya's on it — here's what's happening")}
        </p>
      </div>
      <div className="relative z-20 flex items-center gap-3">
        <form onSubmit={onSearch} className="relative hidden md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-sky" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Freya or jump to Today, Posts, Messages…"
            className="h-10 w-72 rounded-full border border-sky/15 bg-white pr-4 pl-10 text-sm text-ink shadow-sm outline-none placeholder:text-slate-400 focus:border-sky focus:ring-2 focus:ring-sky/25"
          />
        </form>
        <NotificationBell />
      </div>
    </header>
  )
}
