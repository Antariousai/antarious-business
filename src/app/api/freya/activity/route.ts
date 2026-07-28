import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const status = new URL(req.url).searchParams.get('status')

    let query = supabase
      .from('freya_activity_items')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    return Response.json({ items: data ?? [] })
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase
      .from('freya_activity_items')
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)

    if (error) throw error
    return Response.json({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
