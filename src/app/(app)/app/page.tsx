'use client'

import { TierGate } from '@/components/TierGate'
import { CommandCentrePage } from '@/views/CommandCentrePage'

export default function TodayPage() {
  return (
    <TierGate>
      <CommandCentrePage />
    </TierGate>
  )
}
