'use client'

import { LoginPage } from '@/views/LoginPage'
import { AuthGate } from '@/components/providers/AuthGate'

export default function LoginRoutePage() {
  return (
    <AuthGate mode="public">
      <LoginPage />
    </AuthGate>
  )
}
