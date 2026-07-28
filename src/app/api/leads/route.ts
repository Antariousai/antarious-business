import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'leads')

    const { data, error } = await supabase
      .from('leads')
      .select('*, lead_tags(tag)')
      .eq('organization_id', ctx.organizationId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return Response.json({ leads: data ?? [] })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'leads')

    const body = await req.json()
    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: ctx.organizationId,
        name: String(body.name ?? 'Lead'),
        company: body.company ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        stage: body.stage ?? 'new',
        temperature: body.temperature ?? 'warm',
        source: body.source ?? null,
        notes: body.notes ?? null,
      })
      .select('*')
      .single()

    if (error) throw error

    if (Array.isArray(body.tags) && data) {
      await supabase.from('lead_tags').insert(
        body.tags.map((tag: string) => ({ lead_id: data.id, tag: String(tag) })),
      )
    }

    return Response.json({ lead: data }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'leads')

    const body = await req.json()
    const id = String(body.id ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('leads')
      .select('stage')
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle()

    const patch: Record<string, unknown> = {}
    for (const key of [
      'name',
      'company',
      'phone',
      'email',
      'stage',
      'temperature',
      'source',
      'notes',
    ]) {
      if (key in body) patch[key] = body[key]
    }

    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*')
      .single()

    if (error) throw error

    if (body.stage && existing && existing.stage !== body.stage) {
      await supabase.from('lead_stage_events').insert({
        lead_id: id,
        from_stage: existing.stage,
        to_stage: String(body.stage),
        created_by: ctx.user.id,
      })
    }

    return Response.json({ lead: data })
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'leads')

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)

    if (error) throw error
    return Response.json({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
