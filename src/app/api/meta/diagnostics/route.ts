import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { metaConfigured, metaOAuthRedirectUri, instagramOAuthRedirectUri, preferInstagramBusinessLogin, appBaseUrl } from '@/lib/meta/config'
import { tokenEncryptionConfigured } from '@/lib/integrations/crypto/tokenEncryption'
import { resolveStoredAccessToken } from '@/lib/integrations/crypto/tokenEncryption'
import { instagramProvider } from '@/lib/integrations/meta/instagramProvider'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    const { data: connections } = await supabase
      .from('channel_connections')
      .select(
        'id, platform, status, page_name, page_url, token_kind, token_expires_at, last_synced_at, last_error, scopes, external_ig_user_id, external_page_id, connected_at, access_token_enc, access_token',
      )
      .eq('organization_id', ctx.organizationId)
      .eq('provider', 'meta')

    const { count: postsCount } = await supabase
      .from('social_posts')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)

    const { count: commentsCount } = await supabase
      .from('social_comments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)

    const { count: convoCount } = await supabase
      .from('inbox_threads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)
      .in('provider', ['instagram', 'messenger', 'facebook'])

    const { data: lastWebhook } = await supabase
      .from('meta_webhook_events')
      .select('id, status, received_at, event_type, error_message')
      .eq('organization_id', ctx.organizationId)
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const ig = (connections ?? []).find((c) => c.platform === 'Instagram' && c.status === 'connected')
    let tokenValid: 'valid' | 'invalid' | 'unknown' | 'missing' = 'missing'
    if (ig) {
      const token = resolveStoredAccessToken(ig)
      if (!token) tokenValid = 'invalid'
      else {
        try {
          if (ig.token_kind === 'instagram_user') {
            await instagramProvider.getAccount(token)
            tokenValid = 'valid'
          } else {
            tokenValid = 'unknown'
          }
        } catch {
          tokenValid = 'invalid'
        }
      }
    }

    return Response.json({
      metaConfigured: metaConfigured(),
      encryptionConfigured: tokenEncryptionConfigured(),
      igLoginEnabled: preferInstagramBusinessLogin(),
      redirectUris: {
        facebookPageOAuth: metaOAuthRedirectUri(),
        instagramBusinessLogin: instagramOAuthRedirectUri(),
        webhook: `${appBaseUrl()}/api/webhooks/meta`,
      },
      connections: (connections ?? []).map((c) => ({
        id: c.id,
        platform: c.platform,
        status: c.status,
        pageName: c.page_name,
        pageUrl: c.page_url,
        tokenKind: c.token_kind,
        tokenExpiresAt: c.token_expires_at,
        lastSyncedAt: c.last_synced_at,
        lastError: c.last_error,
        scopes: c.scopes,
        connectedAt: c.connected_at,
        // never expose tokens
      })),
      instagram: ig
        ? {
            connected: true,
            account: ig.page_name,
            token: tokenValid,
            tokenExpiresAt: ig.token_expires_at,
            lastSyncedAt: ig.last_synced_at,
            lastError: ig.last_error,
            tokenKind: ig.token_kind,
          }
        : { connected: false },
      counts: {
        postsSynced: postsCount ?? 0,
        commentsSynced: commentsCount ?? 0,
        conversations: convoCount ?? 0,
      },
      lastWebhook: lastWebhook ?? null,
    })
  } catch (err) {
    return jsonError(err)
  }
}
