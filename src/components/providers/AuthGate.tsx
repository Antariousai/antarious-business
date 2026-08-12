'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { useBackendMode } from '@/lib/backend/BackendModeContext'

export function AuthGate({
  children,
  mode,
}: {
  children: ReactNode
  mode: 'public' | 'onboarding' | 'app'
}) {
  const { profile, onboarded, hydrated } = useApp()
  const { ready: backendReady } = useBackendMode()
  const router = useRouter()
  const ready = backendReady && hydrated

  useEffect(() => {
    if (!ready) return
    if (mode === 'public') {
      if (profile && onboarded) router.replace('/app')
      else if (profile && !onboarded) router.replace('/onboarding')
      return
    }
    if (mode === 'onboarding') {
      if (!profile) router.replace('/login')
      else if (onboarded) router.replace('/app')
      return
    }
    // app
    if (!profile) router.replace('/login')
    else if (!onboarded) router.replace('/onboarding')
  }, [mode, profile, onboarded, router, ready])

  if (!ready) return <div className="min-h-screen bg-page" aria-busy="true" />
  if (mode === 'public' && profile) return null
  if (mode === 'onboarding' && (!profile || onboarded)) return null
  if (mode === 'app' && (!profile || !onboarded)) return null

  return <>{children}</>
}
