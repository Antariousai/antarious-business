'use client'

import { OnboardingPage } from '@/views/OnboardingPage'
import { AuthGate } from '@/components/providers/AuthGate'

export default function OnboardingRoutePage() {
  return (
    <AuthGate mode="onboarding">
      <OnboardingPage />
    </AuthGate>
  )
}
