'use client'

import { Suspense } from 'react'
import { LoginPage } from '@/views/LoginPage'
import { AuthGate } from '@/components/providers/AuthGate'

export default function LoginRoutePage() {
  return (
    <AuthGate mode="public">
      <Suspense fallback={<div className="min-h-screen bg-page" aria-busy="true" />}>
        <LoginPage />
      </Suspense>
    </AuthGate>
  )
}
