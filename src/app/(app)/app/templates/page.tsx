'use client'

import { TierGate } from '@/components/TierGate'
import { TemplatesPage } from '@/views/TemplatesPage'

export default function Page() {
  return (
    <TierGate>
      <TemplatesPage />
    </TierGate>
  )
}
