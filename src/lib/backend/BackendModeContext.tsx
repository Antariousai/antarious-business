'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { hasSupabaseEnv } from '@/lib/backend/mode'

type BackendModeValue = {
  /** Supabase public env is present. */
  envConfigured: boolean
  /** Env configured and a Supabase session exists. */
  backend: boolean
  /** Finished first session check. */
  ready: boolean
}

const BackendModeContext = createContext<BackendModeValue>({
  envConfigured: false,
  backend: false,
  ready: false,
})

export function BackendModeProvider({ children }: { children: ReactNode }) {
  const envConfigured = hasSupabaseEnv()
  const [backend, setBackend] = useState(false)
  const [ready, setReady] = useState(!envConfigured)

  useEffect(() => {
    if (!envConfigured) {
      setBackend(false)
      setReady(true)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        if (!cancelled) {
          setBackend(Boolean(data.session))
          setReady(true)
        }
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setBackend(Boolean(session))
        })
        unsubscribe = () => sub.subscription.unsubscribe()
      } catch {
        if (!cancelled) {
          setBackend(false)
          setReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [envConfigured])

  const value = useMemo(
    () => ({ envConfigured, backend, ready }),
    [envConfigured, backend, ready],
  )

  return (
    <BackendModeContext.Provider value={value}>{children}</BackendModeContext.Provider>
  )
}

export function useBackendMode() {
  return useContext(BackendModeContext)
}
