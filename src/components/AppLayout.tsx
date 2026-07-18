import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { AskFreya } from './AskFreya'
import { FreyaTour } from './FreyaTour'

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/app': { title: 'Today' },
  '/app/content': { title: 'Posts' },
  '/app/campaigns': { title: 'Campaigns' },
  '/app/leads': { title: 'Interested people' },
  '/app/pipeline': { title: 'Customers' },
  '/app/inbox': { title: 'Messages' },
  '/app/money': { title: 'Money' },
  '/app/discover': { title: 'Ideas' },
  '/app/templates': { title: 'Templates' },
  '/app/team': { title: 'Team', subtitle: 'Who can help with Freya' },
  '/app/profile': { title: 'Profile', subtitle: 'Your account & business' },
  '/app/settings': { title: 'Settings', subtitle: 'You, channels & Freya' },
}

export function AppLayout() {
  const { pathname } = useLocation()
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
      <Sidebar />
      <div className="app-shell-main flex h-full min-w-0 flex-1 flex-col">
        <TopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              fillHeight
                ? 'relative flex min-h-0 flex-1 flex-col overflow-hidden'
                : 'min-h-0 flex-1 overflow-y-auto'
            }
          >
            <Outlet />
          </div>
        </main>
      </div>
      <AskFreya />
      <FreyaTour />
    </div>
  )
}
