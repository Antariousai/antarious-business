import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'campaigns')

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return Response.json({ campaigns: data ?? [] })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'campaigns')

    const body = await req.json()
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        organization_id: ctx.organizationId,
        title: String(body.title ?? 'Campaign'),
        goal: body.goal ?? null,
        audience: body.audience ?? null,
        platforms: body.platforms ?? [],
        budget_bdt: body.budgetBdt ?? 0,
        objective: body.objective ?? null,
        tone: body.tone ?? null,
        status: body.status ?? 'draft',
      })
      .select('*')
      .single()

    if (error) throw error
    return Response.json({ campaign: data }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'campaigns')

    const body = await req.json()
    const id = String(body.id ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    for (const [from, to] of [
      ['title', 'title'],
      ['goal', 'goal'],
      ['audience', 'audience'],
      ['platforms', 'platforms'],
      ['budgetBdt', 'budget_bdt'],
      ['objective', 'objective'],
      ['tone', 'tone'],
      ['status', 'status'],
    ] as const) {
      if (from in body) patch[to] = body[from]
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*')
      .single()

    if (error) throw error
    return Response.json({ campaign: data })
  } catch (err) {
    return jsonError(err)
  }
}
