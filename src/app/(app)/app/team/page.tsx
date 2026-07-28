'use client'

import { TierGate } from '@/components/TierGate'
import { TeamPage } from '@/views/TeamPage'

export default function Page() {
  return (
    <TierGate>
      <TeamPage />
    </TierGate>
  )
}
