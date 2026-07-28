'use client'

import { TierGate } from '@/components/TierGate'
import { CampaignDetailPage } from '@/views/CampaignDetailPage'

export default function Page() {
  return (
    <TierGate>
      <CampaignDetailPage />
    </TierGate>
  )
}
