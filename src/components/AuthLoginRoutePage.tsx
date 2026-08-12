'use client'

import { Suspense } from 'react'
import { LoginPage } from '@/views/LoginPage'
import { AuthGate } from '@/components/providers/AuthGate'

/** Shared auth shell for `/`, `/login`, and `/signup`. */
export function AuthLoginRoutePage() {
  return (
    <AuthGate mode="public">
      <Suspense fallback={<div className="min-h-screen bg-page" aria-busy="true" />}>
        <LoginPage />
      </Suspense>
    </AuthGate>
  )
}
