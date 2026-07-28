'use client'

import type { ReactNode } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { AuthGate } from '@/components/providers/AuthGate'

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate mode="app">
      <AppLayout>{children}</AppLayout>
    </AuthGate>
  )
}
