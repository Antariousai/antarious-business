import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { resolveStoredAccessToken } from '@/lib/integrations/crypto/tokenEncryption'
import { instagramProvider } from '@/lib/integrations/meta/instagramProvider'
import { getPageLinkedInstagramAccount } from '@/lib/integrations/meta/instagramProvider'
import { facebookProvider } from '@/lib/integrations/meta/facebookProvider'

export const runtime = 'nodejs'

async function loadInstagramConnection(organizationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('platform', 'Instagram')
    .eq('status', 'connected')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Instagram is not connected')
  const token = resolveStoredAccessToken(data)
  if (!token) throw new Error('Instagram connection expired. Reconnect Instagram.')
  return { supabase, conn: data, token }
}

export async function POST() {
  try {
    const supabaseAuth = await createClient()
    const ctx = await requireOrgContext(supabaseAuth)
    const { supabase, conn, token } = await loadInstagramConnection(ctx.organizationId)

    const account =
      conn.token_kind === 'instagram_user'
        ? await instagramProvider.getAccount(token)
        : conn.external_ig_user_id
          ? await getPageLinkedInstagramAccount(token, conn.external_ig_user_id)
          : await facebookProvider.getAccount(token).then((a) => ({
              ...a,
              provider: 'instagram' as const,
              username: conn.page_name?.replace(/^@/, '') ?? null,
            }))

    const pageName = account.username ? `@${account.username}` : conn.page_name
    const { error } = await supabase
      .from('channel_connections')
      .update({
        page_name: pageName,
        external_ig_user_id: account.providerAccountId || conn.external_ig_user_id,
        page_url: account.username
          ? `https://www.instagram.com/${account.username}`
          : conn.page_url,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', conn.id)

    if (error) throw error

    console.info(
      JSON.stringify({
        event: 'meta.media.synced',
        phase: 'account',
        organizationId: ctx.organizationId,
        username: account.username,
      }),
    )

    return Response.json({
      ok: true,
      account: {
        id: account.providerAccountId,
        username: account.username,
        displayName: account.displayName,
      },
      lastSyncedAt: new Date().toISOString(),
    })
  } catch (err) {
    return jsonError(err)
  }
}
