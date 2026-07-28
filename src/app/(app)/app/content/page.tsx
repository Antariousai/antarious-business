'use client'

import { TierGate } from '@/components/TierGate'
import { ContentPage } from '@/views/ContentPage'

export default function Page() {
  return (
    <TierGate>
      <ContentPage />
    </TierGate>
  )
}
