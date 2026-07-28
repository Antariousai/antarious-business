import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'messages')

    const { data, error } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('last_message_at', { ascending: false })

    if (error) throw error
    return Response.json({ threads: data ?? [] })
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
    const { data, error } = await supabase
      .from('inbox_threads')
      .insert({
        organization_id: ctx.organizationId,
        subject: body.subject ?? null,
        contact_name: body.contactName ?? 'Customer',
        platform: body.platform ?? 'WhatsApp',
        status: 'open',
        unread: true,
      })
      .select('*')
      .single()

    if (error) throw error

    if (body.body) {
      await supabase.from('inbox_messages').insert({
        thread_id: data.id,
        organization_id: ctx.organizationId,
        kind: 'customer',
        body: String(body.body),
        delivery_status: 'local_only',
      })
    }

    return Response.json({ thread: data }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}
