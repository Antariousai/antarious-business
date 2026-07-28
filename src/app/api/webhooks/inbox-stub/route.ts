import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/** Simulate inbound customer message (API-key protected). */
export async function POST(req: Request) {
  const secret = req.headers.get('x-webhook-secret') || ''
  if (!process.env.INBOX_WEBHOOK_SECRET || secret !== process.env.INBOX_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const organizationId = String(body.organizationId ?? '')
    if (!organizationId) {
      return Response.json({ error: 'organizationId required' }, { status: 400 })
    }

    const admin = createAdminClient()
    let threadId = body.threadId as string | undefined

    if (!threadId) {
      const { data: thread, error } = await admin
        .from('inbox_threads')
        .insert({
          organization_id: organizationId,
          contact_name: body.contactName ?? 'Customer',
          platform: body.platform ?? 'WhatsApp',
          subject: body.subject ?? null,
          status: 'open',
          unread: true,
        })
        .select('id')
        .single()
      if (error) throw error
      threadId = thread.id
    }

    const { data: message, error: msgError } = await admin
      .from('inbox_messages')
      .insert({
        thread_id: threadId,
        organization_id: organizationId,
        kind: 'customer',
        body: String(body.body ?? ''),
        delivery_status: 'local_only',
      })
      .select('*')
      .single()

    if (msgError) throw msgError

    await admin
      .from('inbox_threads')
      .update({ last_message_at: new Date().toISOString(), unread: true, status: 'open' })
      .eq('id', threadId)

    return Response.json({ threadId, message }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
