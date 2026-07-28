'use client'

import { TierGate } from '@/components/TierGate'
import { PipelinePage } from '@/views/PipelinePage'

export default function Page() {
  return (
    <TierGate>
      <PipelinePage />
    </TierGate>
  )
}
