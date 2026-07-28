'use client'

import { TierGate } from '@/components/TierGate'
import { CampaignsPage } from '@/views/CampaignsPage'

export default function Page() {
  return (
    <TierGate>
      <CampaignsPage />
    </TierGate>
  )
}
