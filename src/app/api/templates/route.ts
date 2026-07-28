import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'templates')

    const { data, error } = await supabase
      .from('post_templates')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return Response.json({ templates: data ?? [] })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'templates')

    const body = await req.json()
    const { data, error } = await supabase
      .from('post_templates')
      .insert({
        organization_id: ctx.organizationId,
        name: String(body.name ?? 'Untitled'),
        caption: String(body.caption ?? ''),
        platforms: Array.isArray(body.platforms) ? body.platforms : [],
        tag: body.tag ?? null,
      })
      .select('*')
      .single()

    if (error) throw error
    return Response.json({ template: data }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'templates')

    const body = await req.json()
    const id = String(body.id ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    for (const key of ['name', 'caption', 'platforms', 'tag']) {
      if (key in body) patch[key] = body[key]
    }

    const { data, error } = await supabase
      .from('post_templates')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*')
      .single()

    if (error) throw error
    return Response.json({ template: data })
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'templates')

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase
      .from('post_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)

    if (error) throw error
    return Response.json({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
