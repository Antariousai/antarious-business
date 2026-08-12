import { NextResponse } from 'next/server'
import {
  metaConfigured,
  metaOAuthRedirectUri,
  instagramOAuthRedirectUri,
  preferInstagramBusinessLogin,
  appBaseUrl,
} from '@/lib/meta/config'
import { tokenEncryptionConfigured } from '@/lib/integrations/crypto/tokenEncryption'

export const runtime = 'nodejs'

/** Public status for Settings UI. */
export async function GET() {
  return NextResponse.json({
    enabled: metaConfigured(),
    redirectUri: metaConfigured() ? metaOAuthRedirectUri() : null,
    instagramRedirectUri: metaConfigured() ? instagramOAuthRedirectUri() : null,
    webhookUri: metaConfigured() ? `${appBaseUrl()}/api/webhooks/meta` : null,
    igLoginEnabled: preferInstagramBusinessLogin(),
    encryptionConfigured: tokenEncryptionConfigured(),
    platforms: {
      Facebook: 'page_oauth',
      Messenger: 'page_oauth',
      Instagram: preferInstagramBusinessLogin() ? 'instagram_login' : 'page_oauth',
    },
  })
}
