import { useState, type ReactNode } from 'react'
import { Outlet, OutletProvider, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'
import { AskFreya } from './AskFreya'
import { FreyaTour } from './FreyaTour'
import { PAGE_META } from './navConfig'

export function AppLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const base = Object.keys(PAGE_META)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || (k !== '/app' && pathname.startsWith(k)))
  const meta = PAGE_META[base || '/app'] || { title: 'Today' }
  const fillHeight =
    pathname.startsWith('/app/inbox') ||
    pathname.startsWith('/app/pipeline') ||
    pathname.startsWith('/app/money') ||
    pathname.startsWith('/app/discover')

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      {drawerOpen && (
        <Sidebar mobile onClose={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} />
      )}
      <div className="app-shell-main flex h-full min-w-0 flex-1 flex-col">
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              fillHeight
                ? 'relative flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0'
                : 'min-h-0 flex-1 overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0'
            }
          >
            <OutletProvider outlet={children ?? null}>
              <Outlet />
            </OutletProvider>
          </div>
        </main>
      </div>
      <MobileNav />
      <AskFreya />
      <FreyaTour />
    </div>
  )
}
