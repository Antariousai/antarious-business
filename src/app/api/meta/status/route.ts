import { NextResponse } from 'next/server'
import { metaConfigured, metaOAuthRedirectUri } from '@/lib/meta/config'

export const runtime = 'nodejs'

/** Public status for Settings UI. */
export async function GET() {
  return NextResponse.json({
    enabled: metaConfigured(),
    redirectUri: metaConfigured() ? metaOAuthRedirectUri() : null,
    platforms: ['Facebook', 'Instagram', 'Messenger'],
  })
}
