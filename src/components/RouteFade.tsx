import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Light page-only enter animation. Must wrap the page slot only — never the
 * app shell (Sidebar / Ask Freya), or every nav remounts chrome.
 */
export function RouteFade({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const location = useLocation()
  return (
    <div
      className={`route-fade route-fade-in ${className}`.trim()}
      key={location.pathname}
    >
      {children}
    </div>
  )
}
