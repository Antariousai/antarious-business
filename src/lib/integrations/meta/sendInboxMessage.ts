import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveStoredAccessToken } from '@/lib/integrations/crypto/tokenEncryption'
import { instagramProvider } from '@/lib/integrations/meta/instagramProvider'
import { facebookProvider, messengerProvider } from '@/lib/integrations/meta/facebookProvider'
import { MetaApiError } from '@/lib/integrations/meta/client'

export type OutboundSendResult =
  | { ok: true; providerMessageId: string; deliveryStatus: 'sent' }
  | { ok: false; deliveryStatus: 'failed' | 'sent_stub'; error: string; userMessage: string }

function friendlyMetaError(err: unknown): string {
  if (err instanceof MetaApiError) {
    if (err.code === 190 || /session has expired|oauth/i.test(err.message)) {
      return 'Instagram/Facebook connection expired. Reconnect in Settings.'
    }
    if (err.code === 10 || /permission/i.test(err.message)) {
      return 'Missing Meta permission. Reconnect and grant messaging access.'
    }
    if (err.status === 429 || err.code === 4 || err.code === 17) {
      return 'Meta rate limit hit. Try again in a few minutes.'
    }
    return err.message
  }
  return err instanceof Error ? err.message : 'Failed to send via Meta'
}

/**
 * Send an outbound inbox message through Meta when the thread is linked.
 * Returns sent_stub when the thread has no Meta connection (demo / local channels).
 */
export async function sendOutboundViaMeta(
  supabase: SupabaseClient,
  organizationId: string,
  threadId: string,
  text: string,
): Promise<OutboundSendResult> {
  const { data: thread, error } = await supabase
    .from('inbox_threads')
    .select('id, provider, connection_id, provider_conversation_id, metadata, platform')
    .eq('id', threadId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (error) throw error
  if (!thread?.connection_id) {
    return { ok: false, deliveryStatus: 'sent_stub', error: 'no_connection', userMessage: 'Sent locally (channel not linked to Meta).' }
  }

  const { data: conn, error: cErr } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', thread.connection_id)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (cErr) throw cErr
  if (!conn || conn.status !== 'connected') {
    return {
      ok: false,
      deliveryStatus: 'failed',
      error: 'disconnected',
      userMessage: 'Social connection expired. Reconnect in Settings.',
    }
  }

  const token = resolveStoredAccessToken(conn)
  if (!token) {
    return {
      ok: false,
      deliveryStatus: 'failed',
      error: 'token',
      userMessage: 'Connection expired. Reconnect Instagram/Facebook in Settings.',
    }
  }

  const meta = (thread.metadata || {}) as { recipient_igs_id?: string; recipient_id?: string }
  const recipientId =
    meta.recipient_igs_id ||
    meta.recipient_id ||
    thread.provider_conversation_id ||
    null
  if (!recipientId) {
    return {
      ok: false,
      deliveryStatus: 'failed',
      error: 'no_recipient',
      userMessage: 'Cannot determine recipient for this conversation.',
    }
  }

  const provider =
    thread.provider === 'instagram' || thread.platform === 'instagram'
      ? instagramProvider
      : thread.provider === 'messenger' || thread.platform === 'messenger'
        ? messengerProvider
        : facebookProvider

  try {
    const result = await provider.sendMessage!(token, { recipientId, text })
    console.info(
      JSON.stringify({
        event: 'meta.message.sent',
        organizationId,
        threadId,
        provider: provider.id,
        providerMessageId: result.providerMessageId,
      }),
    )
    await supabase
      .from('channel_connections')
      .update({ last_error: null })
      .eq('id', conn.id)
    return { ok: true, providerMessageId: result.providerMessageId, deliveryStatus: 'sent' }
  } catch (err) {
    const userMessage = friendlyMetaError(err)
    const technical = err instanceof Error ? err.message : String(err)
    await supabase
      .from('channel_connections')
      .update({ last_error: technical.slice(0, 500) })
      .eq('id', conn.id)
    console.error(
      JSON.stringify({
        event: 'meta.api.error',
        phase: 'send_message',
        organizationId,
        threadId,
        message: technical,
      }),
    )
    return { ok: false, deliveryStatus: 'failed', error: technical, userMessage }
  }
}
