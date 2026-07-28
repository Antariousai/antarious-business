import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'

export const runtime = 'nodejs'

type Payload = {
  action?: string
  post_id?: string
  message_id?: string
  thread_id?: string
  [key: string]: unknown
}

async function applyPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  payload: Payload,
) {
  const action = payload.action
  if (action === 'publish_post' && payload.post_id) {
    const { error } = await supabase
      .from('content_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', payload.post_id)
      .eq('organization_id', organizationId)
    if (error) throw error
    return { applied: 'publish_post', post_id: payload.post_id }
  }

  if (action === 'send_inbox_draft' && payload.message_id) {
    const { data: msg, error } = await supabase
      .from('inbox_messages')
      .update({ kind: 'you', delivery_status: 'sent_stub' })
      .eq('id', payload.message_id)
      .eq('organization_id', organizationId)
      .eq('kind', 'freya_draft')
      .select('thread_id')
      .maybeSingle()
    if (error) throw error
    if (msg?.thread_id) {
      await supabase
        .from('inbox_threads')
        .update({ status: 'handled', unread: false, last_message_at: new Date().toISOString() })
        .eq('id', msg.thread_id)
    }
    return { applied: 'send_inbox_draft', message_id: payload.message_id }
  }

  if (action === 'create_lead' && payload.lead) {
    const lead = payload.lead as {
      name: string
      company?: string
      phone?: string
      email?: string
      stage?: string
      notes?: string
    }
    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name: lead.name,
        company: lead.company ?? null,
        phone: lead.phone ?? null,
        email: lead.email ?? null,
        stage: lead.stage ?? 'new',
        notes: lead.notes ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    return { applied: 'create_lead', lead_id: data.id }
  }

  return { applied: 'noop', payload }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()
    const ids: string[] = body.ids ?? (body.id ? [body.id] : [])
    const approveAll = Boolean(body.approveAll)

    let query = supabase
      .from('freya_activity_items')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'waiting')

    if (!approveAll) {
      if (!ids.length) {
        return Response.json({ error: 'Provide id, ids, or approveAll' }, { status: 400 })
      }
      query = query.in('id', ids)
    }

    const { data: items, error } = await query
    if (error) throw error

    const results = []
    for (const item of items ?? []) {
      const applied = await applyPayload(
        supabase,
        ctx.organizationId,
        (item.payload ?? {}) as Payload,
      )
      await supabase
        .from('freya_activity_items')
        .update({ status: 'done', resolved_at: new Date().toISOString() })
        .eq('id', item.id)
      await supabase.from('freya_audit_log').insert({
        organization_id: ctx.organizationId,
        activity_id: item.id,
        action: 'approve',
        actor_id: ctx.user.id,
        detail: applied,
      })
      results.push({ id: item.id, ...applied })
    }

    return Response.json({ ok: true, results })
  } catch (err) {
    return jsonError(err)
  }
}
