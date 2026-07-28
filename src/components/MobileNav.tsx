import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MoreHorizontal, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useInbox } from '../context/InboxContext'
import { useDiscover } from '../context/DiscoverContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { MOBILE_MORE, MOBILE_PRIMARY } from './navConfig'

export function MobileNav() {
  const { canAccess } = useApp()
  const { unreadCount } = useInbox()
  const { newSignalCount } = useDiscover()
  const { waitingCount } = useFreyaActivity()
  const [moreOpen, setMoreOpen] = useState(false)

  const badges: Record<string, number> = {
    home: waitingCount,
    inbox: unreadCount,
    discover: newSignalCount,
  }

  const primary = MOBILE_PRIMARY.filter((n) => canAccess(n.module))
  const more = MOBILE_MORE.filter((n) => canAccess(n.module))

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-sky/15 bg-white/95 px-1 pt-1 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-stretch justify-around">
          {primary.map((item) => {
            const badge = item.badgeKey ? badges[item.badgeKey] : undefined
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold transition ${
                    isActive ? 'text-sky-bright' : 'text-neutral-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative flex h-8 w-8 items-center justify-center rounded-xl ${
                        isActive ? 'bg-sky-soft text-sky-bright' : 'text-neutral-500'
                      }`}
                    >
                      <item.icon className="h-4.5 w-4.5" />
                      {badge != null && badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sunshine px-0.5 text-[9px] font-bold text-navy-deep">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span className="truncate">{item.shortLabel || item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold text-neutral-500"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl">
              <MoreHorizontal className="h-5 w-5" />
            </span>
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-navy-deep/45"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-ink">More</h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {more.map((item) => {
                const badge = item.badgeKey ? badges[item.badgeKey] : undefined
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-sky/10 bg-sky-soft/30 px-2 py-3 text-center"
                  >
                    <span className={`nav-icon-chip ${item.chip}`}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-bold text-ink">
                      {item.shortLabel || item.label}
                    </span>
                    {badge != null && badge > 0 && (
                      <span className="rounded-full bg-sunshine px-1.5 text-[10px] font-bold text-navy-deep">
                        {badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
