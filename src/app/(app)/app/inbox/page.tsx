'use client'

import { TierGate } from '@/components/TierGate'
import { InboxPage } from '@/views/InboxPage'

export default function Page() {
  return (
    <TierGate>
      <InboxPage />
    </TierGate>
  )
}
