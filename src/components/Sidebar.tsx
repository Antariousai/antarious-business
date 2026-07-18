import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  CalendarDays,
  Megaphone,
  Users,
  Telescope,
  Inbox,
  Wallet,
  Compass,
  LayoutTemplate,
  Settings,
  LogOut,
  UserPlus,
} from 'lucide-react'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { FreyaAvatar } from './FreyaAvatar'
import { useApp } from '../context/AppContext'
import { useInbox } from '../context/InboxContext'
import { useDiscover } from '../context/DiscoverContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import type { AppModule } from '../data/planTiers'

const NAV: {
  to: string
  end?: boolean
  label: string
  sub: string
  icon: typeof Home
  module: AppModule
  badgeKey?: 'home' | 'inbox' | 'discover'
  chip: string
}[] = [
  {
    to: '/app',
    end: true,
    label: 'Today',
    sub: 'What needs you',
    icon: Home,
    module: 'today',
    badgeKey: 'home',
    chip: 'bg-sky/25 text-sky-muted',
  },
  {
    to: '/app/content',
    label: 'Posts',
    sub: 'Posts & calendar',
    icon: CalendarDays,
    module: 'posts',
    chip: 'bg-rose-400/25 text-rose-300',
  },
  {
    to: '/app/campaigns',
    label: 'Campaigns',
    sub: 'Your next push',
    icon: Megaphone,
    module: 'campaigns',
    chip: 'bg-amber-400/25 text-amber-300',
  },
  {
    to: '/app/leads',
    label: 'Interested people',
    sub: 'People to follow up',
    icon: Users,
    module: 'leads',
    chip: 'bg-orange-400/25 text-orange-300',
  },
  {
    to: '/app/pipeline',
    label: 'Customers',
    sub: 'People & deals',
    icon: Telescope,
    module: 'customers',
    chip: 'bg-indigo-400/25 text-indigo-300',
  },
  {
    to: '/app/inbox',
    label: 'Messages',
    sub: 'Replies & chats',
    icon: Inbox,
    module: 'messages',
    badgeKey: 'inbox',
    chip: 'bg-emerald-400/25 text-emerald-300',
  },
  {
    to: '/app/money',
    label: 'Money',
    sub: 'To collect · this week',
    icon: Wallet,
    module: 'money',
    chip: 'bg-lime-400/25 text-lime-300',
  },
  {
    to: '/app/discover',
    label: 'Ideas',
    sub: 'Ideas from Freya',
    icon: Compass,
    module: 'ideas',
    badgeKey: 'discover',
    chip: 'bg-teal-400/25 text-teal-300',
  },
  {
    to: '/app/templates',
    label: 'Templates',
    sub: 'Post styles that work',
    icon: LayoutTemplate,
    module: 'templates',
    chip: 'bg-fuchsia-400/20 text-fuchsia-300',
  },
  {
    to: '/app/team',
    label: 'Team',
    sub: 'Who can help',
    icon: UserPlus,
    module: 'team',
    chip: 'bg-violet-400/25 text-violet-300',
  },
  {
    to: '/app/settings',
    label: 'Settings',
    sub: 'You & Freya',
    icon: Settings,
    module: 'settings',
    chip: 'bg-slate-400/25 text-slate-300',
  },
]

export function Sidebar() {
  const { profile, logout, canAccess, entitlements, planTier } = useApp()
  const { unreadCount } = useInbox()
  const { newSignalCount } = useDiscover()
  const { waitingCount, openPanel } = useFreyaActivity()
  const isStarter = planTier === 'starter'
  const navigate = useNavigate()
  const owner = profile?.ownerName || 'Joy'
  const initial = owner.charAt(0).toUpperCase()

  const badges: Record<string, number> = {
    home: waitingCount,
    inbox: unreadCount,
    discover: newSignalCount,
  }

  const visibleNav = NAV.filter((item) => canAccess(item.module))

  return (
    <aside className="relative flex h-screen w-[260px] shrink-0 flex-col overflow-hidden bg-navy-deep text-white">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-sky/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 -left-10 h-36 w-36 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex items-center border-b border-white/8 px-5 py-5">
        <Logo light size={34} className="max-w-[11.5rem]" />
      </div>
      <p className="relative px-5 pb-3 pt-3 text-[10px] font-bold tracking-wide text-sky-muted/90 uppercase">
        {entitlements.label} plan
      </p>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {visibleNav.map((item) => {
          const badge = item.badgeKey ? badges[item.badgeKey] : undefined
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-2.5 py-2 transition ${
                  isActive
                    ? 'bg-gradient-to-r from-sky to-sky-bright text-white shadow-lg shadow-sky/25'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`nav-icon-chip ${
                      isActive ? 'bg-white/20 text-white' : item.chip
                    }`}
                  >
                    <item.icon className="h-[16px] w-[16px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold leading-tight">{item.label}</div>
                    <div
                      className={`text-[11px] leading-tight ${isActive ? 'text-white/80' : 'text-slate-500'}`}
                    >
                      {item.sub}
                    </div>
                  </div>
                  {badge != null && badge > 0 && (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        isActive ? 'bg-white text-sky' : 'bg-sunshine text-navy-deep'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="relative space-y-3 border-t border-white/10 bg-black/20 px-4 py-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => openPanel(isStarter ? 'chat' : waitingCount > 0 ? 'activity' : 'chat')}
          className={`flex w-full items-center gap-2.5 text-left transition ${
            isStarter
              ? 'rounded-2xl bg-gradient-to-r from-sky/35 to-emerald-400/20 px-3 py-3 ring-2 ring-sky/40 hover:from-sky/45'
              : 'rounded-xl bg-gradient-to-r from-sky/20 to-emerald-400/10 px-2 py-2 ring-1 ring-white/10 hover:from-sky/30'
          }`}
        >
          <FreyaAvatar size={isStarter ? 42 : 36} online />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              {isStarter ? 'Talk to Freya' : 'Freya'}
              {waitingCount > 0 && (
                <span className="rounded-full bg-sunshine px-1.5 text-[10px] font-bold text-navy-deep">
                  {waitingCount}
                </span>
              )}
            </div>
            <div className={`text-emerald-300/90 ${isStarter ? 'text-[12px]' : 'text-[11px]'}`}>
              {isStarter ? 'Just say what you need' : 'Online · your AI teammate'}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/app/profile')}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-left transition hover:bg-white/5"
            title="Open your profile"
          >
            <Avatar letter={initial} size={36} color="#38bdf8" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{owner}</div>
              <div className="truncate text-[11px] text-slate-400">
                {profile?.businessName || 'Business Owner'}
              </div>
            </div>
          </button>
          <button
            type="button"
            title="Log out"
            onClick={() => logout()}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
