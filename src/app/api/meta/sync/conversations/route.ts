import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { resolveStoredAccessToken } from '@/lib/integrations/crypto/tokenEncryption'
import { instagramProvider } from '@/lib/integrations/meta/instagramProvider'

export const runtime = 'nodejs'

/**
 * Optional Instagram conversation history sync.
 * If Meta returns [], local conversations are NEVER deleted.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    const { data: conn } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .eq('platform', 'Instagram')
      .eq('status', 'connected')
      .maybeSingle()
    if (!conn) return Response.json({ error: 'Instagram is not connected' }, { status: 400 })

    const token = resolveStoredAccessToken(conn)
    if (!token) {
      return Response.json({ error: 'Instagram connection expired. Reconnect Instagram.' }, { status: 401 })
    }

    let remote: Array<{ id: string; updatedTime?: string | null }> = []
    let syncError: string | null = null
    try {
      remote = (await instagramProvider.listConversations?.(token)) ?? []
    } catch (e) {
      syncError = e instanceof Error ? e.message : String(e)
      remote = []
    }

    const { count: localCount } = await supabase
      .from('inbox_threads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)
      .eq('provider', 'instagram')

    await supabase
      .from('channel_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: syncError,
        metadata: {
          ...((conn.metadata as object) || {}),
          lastConversationSync: {
            at: new Date().toISOString(),
            remoteCount: remote.length,
            localCount: localCount ?? 0,
            note:
              remote.length === 0
                ? 'Remote empty or unavailable — local conversations retained. Prefer webhooks for DMs.'
                : 'Remote conversations listed (history sync not fully expanded).',
          },
        },
      })
      .eq('id', conn.id)

    console.info(
      JSON.stringify({
        event: 'meta.media.synced',
        phase: 'conversations',
        organizationId: ctx.organizationId,
        remoteCount: remote.length,
        localCount: localCount ?? 0,
      }),
    )

    return Response.json({
      ok: true,
      remoteCount: remote.length,
      localCount: localCount ?? 0,
      retainedLocal: true,
      message:
        remote.length === 0
          ? 'No remote conversations returned. Local inbox unchanged — use webhooks for new DMs.'
          : `Listed ${remote.length} remote conversation(s). Full history backfill not required.`,
      error: syncError,
    })
  } catch (err) {
    return jsonError(err)
  }
}
