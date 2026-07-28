'use client'

import { TierGate } from '@/components/TierGate'
import { DiscoverPage } from '@/views/DiscoverPage'

export default function Page() {
  return (
    <TierGate>
      <DiscoverPage />
    </TierGate>
  )
}
