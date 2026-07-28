import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'messages')

    const threadId = new URL(req.url).searchParams.get('threadId')
    if (!threadId) return Response.json({ error: 'threadId required' }, { status: 400 })

    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return Response.json({ messages: data ?? [] })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'messages')

    const body = await req.json()
    const threadId = String(body.threadId ?? '')
    if (!threadId) return Response.json({ error: 'threadId required' }, { status: 400 })

    const kind = body.kind === 'freya_draft' ? 'freya_draft' : 'you'
    const { data, error } = await supabase
      .from('inbox_messages')
      .insert({
        thread_id: threadId,
        organization_id: ctx.organizationId,
        kind,
        body: String(body.body ?? ''),
        delivery_status: kind === 'you' ? 'sent_stub' : 'local_only',
        created_by: ctx.user.id,
      })
      .select('*')
      .single()

    if (error) throw error

    await supabase
      .from('inbox_threads')
      .update({ last_message_at: new Date().toISOString(), unread: false })
      .eq('id', threadId)

    if (kind === 'freya_draft') {
      await supabase.from('freya_activity_items').insert({
        organization_id: ctx.organizationId,
        kind: 'send_inbox_draft',
        title: 'Approve Freya reply',
        summary: String(body.body ?? '').slice(0, 120),
        status: 'waiting',
        payload: { action: 'send_inbox_draft', message_id: data.id, thread_id: threadId },
        href: '/app/inbox',
        created_by: ctx.user.id,
      })
    }

    return Response.json({ message: data }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'messages')

    const body = await req.json()
    const id = String(body.id ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const action = String(body.action ?? 'update')

    if (action === 'discard') {
      const { error } = await supabase
        .from('inbox_messages')
        .delete()
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .eq('kind', 'freya_draft')
      if (error) throw error
      return Response.json({ ok: true })
    }

    if (action === 'approve') {
      const { data: msg, error } = await supabase
        .from('inbox_messages')
        .update({ kind: 'you', delivery_status: 'sent_stub' })
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .eq('kind', 'freya_draft')
        .select('thread_id')
        .maybeSingle()
      if (error) throw error
      if (msg?.thread_id) {
        await supabase
          .from('inbox_threads')
          .update({
            status: 'handled',
            unread: false,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', msg.thread_id)
      }
      await supabase
        .from('freya_activity_items')
        .update({ status: 'done', resolved_at: new Date().toISOString() })
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'waiting')
        .contains('payload', { message_id: id })
      return Response.json({ ok: true, message: msg })
    }

    if ('body' in body) {
      const { data, error } = await supabase
        .from('inbox_messages')
        .update({ body: String(body.body ?? '') })
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ message: data })
    }

    return Response.json({ error: 'Nothing to update' }, { status: 400 })
  } catch (err) {
    return jsonError(err)
  }
}
