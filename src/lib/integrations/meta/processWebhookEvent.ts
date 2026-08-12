import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export function fingerprintWebhookEvent(payload: unknown): string {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return createHash('sha256').update(raw).digest('hex')
}

export type NormalizedInboundMessage = {
  provider: 'instagram' | 'messenger' | 'facebook'
  /** IG user id or Page id that owns the connection */
  accountId: string
  /** Provider conversation / thread key (may equal sender for 1:1 IG DMs) */
  conversationId: string
  messageId: string
  senderId: string
  text: string
  timestamp?: string | null
  raw: unknown
}

/**
 * Normalize CURRENT Meta webhook messaging payloads (Instagram + Page Messenger).
 * Unknown shapes are skipped — never invent IDs.
 */
export function extractInboundMessages(body: unknown): NormalizedInboundMessage[] {
  if (!body || typeof body !== 'object') return []
  const root = body as {
    object?: string
    entry?: Array<{
      id?: string
      time?: number
      messaging?: Array<{
        sender?: { id?: string }
        recipient?: { id?: string }
        timestamp?: number
        message?: { mid?: string; text?: string; is_echo?: boolean }
      }>
    }>
  }

  const object = root.object
  const provider: NormalizedInboundMessage['provider'] =
    object === 'instagram' ? 'instagram' : object === 'page' ? 'messenger' : 'facebook'

  const out: NormalizedInboundMessage[] = []
  for (const entry of root.entry ?? []) {
    const accountId = entry.id
    if (!accountId) continue
    for (const m of entry.messaging ?? []) {
      if (m.message?.is_echo) continue
      const senderId = m.sender?.id
      const text = m.message?.text
      const messageId = m.message?.mid
      if (!senderId || !messageId || text == null) continue
      // Skip messages where the Page/IG account is the sender (echoes sometimes omit is_echo)
      if (senderId === accountId) continue
      out.push({
        provider,
        accountId,
        conversationId: senderId,
        messageId,
        senderId,
        text,
        timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : null,
        raw: m,
      })
    }
  }
  return out
}

async function resolveConnection(
  admin: SupabaseClient,
  msg: NormalizedInboundMessage,
) {
  if (msg.provider === 'instagram') {
    const { data } = await admin
      .from('channel_connections')
      .select('*')
      .eq('platform', 'Instagram')
      .eq('status', 'connected')
      .eq('external_ig_user_id', msg.accountId)
      .maybeSingle()
    if (data) return data
  }
  const { data: byPage } = await admin
    .from('channel_connections')
    .select('*')
    .eq('status', 'connected')
    .eq('external_page_id', msg.accountId)
    .in('platform', msg.provider === 'instagram' ? ['Instagram', 'Facebook'] : ['Facebook', 'Messenger'])
    .maybeSingle()
  return byPage
}

export async function persistAndProcessWebhook(payload: unknown): Promise<{
  eventId: string
  duplicate: boolean
  processed: number
}> {
  const admin = createAdminClient()
  const eventKey = fingerprintWebhookEvent(payload)
  const insert = await admin
    .from('meta_webhook_events')
    .insert({
      provider: 'meta',
      event_key: eventKey,
      event_type: (payload as { object?: string })?.object ?? 'unknown',
      payload,
      status: 'received',
    })
    .select('id')
    .single()

  if (insert.error) {
    if (insert.error.code === '23505') {
      const { data: existing } = await admin
        .from('meta_webhook_events')
        .select('id')
        .eq('provider', 'meta')
        .eq('event_key', eventKey)
        .maybeSingle()
      return { eventId: existing?.id || eventKey, duplicate: true, processed: 0 }
    }
    throw new Error(insert.error.message)
  }

  const eventId = insert.data.id
  await admin
    .from('meta_webhook_events')
    .update({ status: 'processing', attempts: 1 })
    .eq('id', eventId)

  try {
    const messages = extractInboundMessages(payload)
    let processed = 0
    let organizationId: string | null = null
    let connectionId: string | null = null

    for (const msg of messages) {
      const conn = await resolveConnection(admin, msg)
      if (!conn) continue
      organizationId = conn.organization_id
      connectionId = conn.id

      const platformLabel =
        msg.provider === 'instagram' ? 'instagram' : msg.provider === 'messenger' ? 'messenger' : 'facebook'

      // Social contact
      const { data: contact } = await admin
        .from('social_contacts')
        .upsert(
          {
            organization_id: conn.organization_id,
            provider: msg.provider === 'messenger' ? 'facebook' : msg.provider,
            provider_user_id: msg.senderId,
            username: null,
            display_name: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,provider,provider_user_id' },
        )
        .select('id')
        .single()

      // Thread
      const providerConvo = msg.conversationId
      let threadId: string | null = null
      const { data: existingThread } = await admin
        .from('inbox_threads')
        .select('id')
        .eq('organization_id', conn.organization_id)
        .eq('provider', msg.provider)
        .eq('provider_conversation_id', providerConvo)
        .maybeSingle()

      if (existingThread) {
        threadId = existingThread.id
      } else {
        const { data: created, error: tErr } = await admin
          .from('inbox_threads')
          .insert({
            organization_id: conn.organization_id,
            contact_name: contact?.id ? `Customer` : 'Instagram customer',
            subject: msg.text.slice(0, 80),
            platform: platformLabel,
            unread: true,
            status: 'open',
            last_message_at: msg.timestamp || new Date().toISOString(),
            connection_id: conn.id,
            provider: msg.provider,
            provider_conversation_id: providerConvo,
            social_contact_id: contact?.id ?? null,
            metadata: { recipient_igs_id: msg.senderId },
          })
          .select('id')
          .single()
        if (tErr) throw tErr
        threadId = created.id
      }

      // Message (idempotent on provider_message_id)
      const { error: mErr } = await admin.from('inbox_messages').upsert(
        {
          organization_id: conn.organization_id,
          thread_id: threadId,
          kind: 'customer',
          body: msg.text,
          delivery_status: 'local_only',
          provider_message_id: msg.messageId,
          direction: 'inbound',
          sender_type: 'customer',
          content_type: 'text',
          provider_timestamp: msg.timestamp,
          raw_payload: msg.raw,
        },
        { onConflict: 'organization_id,provider_message_id', ignoreDuplicates: true },
      )
      // unique index is partial — upsert onConflict may not match; fall back to insert ignore
      if (mErr) {
        const { error: insErr } = await admin.from('inbox_messages').insert({
          organization_id: conn.organization_id,
          thread_id: threadId,
          kind: 'customer',
          body: msg.text,
          delivery_status: 'local_only',
          provider_message_id: msg.messageId,
          direction: 'inbound',
          sender_type: 'customer',
          content_type: 'text',
          provider_timestamp: msg.timestamp,
          raw_payload: msg.raw,
        })
        if (insErr && !String(insErr.message).toLowerCase().includes('duplicate')) {
          // ignore unique violations
          if (insErr.code !== '23505') throw insErr
        }
      }

      await admin
        .from('inbox_threads')
        .update({
          last_message_at: msg.timestamp || new Date().toISOString(),
          unread: true,
          subject: msg.text.slice(0, 80),
        })
        .eq('id', threadId)

      processed += 1
      console.info(
        JSON.stringify({
          event: 'meta.message.received',
          provider: msg.provider,
          organizationId: conn.organization_id,
          messageId: msg.messageId,
        }),
      )
    }

    await admin
      .from('meta_webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        organization_id: organizationId,
        connection_id: connectionId,
        error_message: null,
      })
      .eq('id', eventId)

    console.info(
      JSON.stringify({
        event: 'meta.webhook.processed',
        eventId,
        processed,
      }),
    )

    return { eventId, duplicate: false, processed }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await admin
      .from('meta_webhook_events')
      .update({ status: 'failed', error_message: message.slice(0, 500) })
      .eq('id', eventId)
    console.error(JSON.stringify({ event: 'meta.webhook.failed', eventId, message }))
    // Still acknowledge to Meta — event is stored for retry
    return { eventId, duplicate: false, processed: 0 }
  }
}
