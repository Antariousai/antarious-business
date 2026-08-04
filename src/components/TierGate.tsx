import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useApp } from '../context/AppContext'
import { PLAN_TIERS, minTierForModule, PATH_MODULE, type AppModule } from '../data/planTiers'

/** Blocks modules the current plan doesn’t include — same chrome, clear upgrade path. */
export function TierGate({ children }: { children: ReactNode }) {
  const { canAccessRoute, planTier, setPlanTier } = useApp()
  const { pathname } = useLocation()

  if (canAccessRoute(pathname)) {
    return <>{children}</>
  }

  const match = Object.keys(PATH_MODULE)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || (k !== '/app' && pathname.startsWith(k)))
  const module = (match ? PATH_MODULE[match] : 'today') as AppModule
  const need = minTierForModule(module)
  const needLabel = PLAN_TIERS[need].label

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
      <p className="text-[18px] font-bold text-ink">This is on {needLabel}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        You’re on {PLAN_TIERS[planTier].label}. You can try {needLabel} now (demo) or head back to
        Home.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setPlanTier(need)}
          className="rounded-full bg-sky px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sky-bright"
        >
          Try {needLabel}
        </button>
        <Link
          to="/app"
          className="rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
