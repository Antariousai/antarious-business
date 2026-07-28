import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess, assertSeatAvailable } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'team')

    const [{ data: members }, { data: invites }] = await Promise.all([
      supabase
        .from('organization_members')
        .select('id, role, user_id, created_at, profiles:user_id(full_name)')
        .eq('organization_id', ctx.organizationId),
      supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ])

    return Response.json({ members: members ?? [], invites: invites ?? [] })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'team')

    // MVP seat limit: Scale default 5 until billing seats wired
    await assertSeatAvailable(supabase, ctx.organizationId, 5)

    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    if (!email) return Response.json({ error: 'email required' }, { status: 400 })

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        organization_id: ctx.organizationId,
        email,
        role: body.role ?? 'editor',
        invited_by: ctx.user.id,
      })
      .select('*')
      .single()

    if (error) throw error
    return Response.json({ invite: data }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}
