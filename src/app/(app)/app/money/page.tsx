'use client'

import { TierGate } from '@/components/TierGate'
import { MoneyPage } from '@/views/MoneyPage'

export default function Page() {
  return (
    <TierGate>
      <MoneyPage />
    </TierGate>
  )
}
