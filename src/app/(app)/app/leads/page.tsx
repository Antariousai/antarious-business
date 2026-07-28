'use client'

import { TierGate } from '@/components/TierGate'
import { LeadsPage } from '@/views/LeadsPage'

export default function Page() {
  return (
    <TierGate>
      <LeadsPage />
    </TierGate>
  )
}
