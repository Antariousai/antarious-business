import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { FreyaAvatar } from './FreyaAvatar'
import { useApp } from '../context/AppContext'
import { useInbox } from '../context/InboxContext'
import { useDiscover } from '../context/DiscoverContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { NAV } from './navConfig'

export function Sidebar({
  mobile = false,
  onNavigate,
  onClose,
}: {
  mobile?: boolean
  onNavigate?: () => void
  onClose?: () => void
} = {}) {
  const { profile, logout, canAccess, entitlements, planTier } = useApp()
  const { unreadCount } = useInbox()
  const { newSignalCount } = useDiscover()
  const { waitingCount, openPanel } = useFreyaActivity()
  const isStarter = planTier === 'starter'
  const navigate = useNavigate()
  const owner = profile?.ownerName || 'Nusrat'
  const initial = owner.charAt(0).toUpperCase()

  const badges: Record<string, number> = {
    home: waitingCount,
    inbox: unreadCount,
    discover: newSignalCount,
  }

  const visibleNav = NAV.filter((item) => canAccess(item.module))

  const shell = (
    <aside
      className={`relative flex h-full w-[260px] shrink-0 flex-col overflow-hidden bg-navy-deep text-white ${
        mobile ? 'max-w-[85vw]' : 'h-screen'
      }`}
    >
      <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-sky/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 -left-10 h-36 w-36 rounded-full bg-sunshine/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-32 w-32 rounded-full bg-mint/10 blur-3xl" />

      <div className="relative flex items-center justify-between border-b border-white/8 px-5 py-5">
        <Logo light size={34} className="max-w-[11.5rem]" />
        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-300 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="relative px-5 pb-3 pt-3 text-[10px] font-bold tracking-wide text-sky-muted/90 uppercase">
        {entitlements.label} plan
      </p>

      <nav className="relative flex-1 space-y-1 overflow-y-auto scrollbar-none px-3 pb-4">
        {visibleNav.map((item) => {
          const badge = item.badgeKey ? badges[item.badgeKey] : undefined
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-2.5 py-2 transition ${
                  isActive
                    ? 'bg-gradient-to-r from-sky to-sky-bright text-white shadow-lg shadow-sky/25'
                    : 'text-neutral-300 hover:bg-white/8 hover:text-white'
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
                      className={`text-[11px] leading-tight ${isActive ? 'text-white/80' : 'text-neutral-500'}`}
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
          onClick={() => {
            openPanel(isStarter ? 'chat' : waitingCount > 0 ? 'activity' : 'chat')
            onNavigate?.()
          }}
          className={`flex w-full items-center gap-2.5 text-left transition ${
            isStarter
              ? 'rounded-2xl bg-gradient-to-r from-sky/35 to-mint/20 px-3 py-3 ring-2 ring-sky/40 hover:from-sky/45'
              : 'rounded-xl bg-gradient-to-r from-sky/20 to-mint/10 px-2 py-2 ring-1 ring-white/10 hover:from-sky/30'
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
            <div className={`text-mint/90 ${isStarter ? 'text-[12px]' : 'text-[11px]'}`}>
              {isStarter ? 'Just say what you need' : 'Online · your AI teammate'}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              navigate('/app/profile')
              onNavigate?.()
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-left transition hover:bg-white/5"
            title="Open your profile"
          >
            <Avatar letter={initial} size={36} color="#38bdf8" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{owner}</div>
              <div className="truncate text-[11px] text-neutral-400">
                {profile?.businessName || 'Business Owner'}
              </div>
            </div>
          </button>
          <button
            type="button"
            title="Log out"
            onClick={() => logout()}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )

  if (!mobile) return shell

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-navy-deep/50 backdrop-blur-[2px]"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="relative z-10 h-full animate-[tpl-drawer-in_0.3s_ease]">{shell}</div>
    </div>
  )
}
