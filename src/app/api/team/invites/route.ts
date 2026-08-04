import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess, assertSeatAvailable } from '@/lib/entitlements'
import { sendTeamInviteEmail } from '@/lib/email/sendTeamInvite'

export const runtime = 'nodejs'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

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
    if (!isValidEmail(email)) {
      return Response.json({ error: 'Enter a valid work or personal email' }, { status: 400 })
    }

    const role = String(body.role ?? 'editor').toLowerCase()
    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 })
    }

    const [{ data: biz }, { data: profile }, { data: org }] = await Promise.all([
      supabase
        .from('business_profiles')
        .select('business_name')
        .eq('organization_id', ctx.organizationId)
        .maybeSingle(),
      supabase.from('profiles').select('full_name').eq('id', ctx.user.id).maybeSingle(),
      supabase.from('organizations').select('name').eq('id', ctx.organizationId).maybeSingle(),
    ])

    const businessName =
      biz?.business_name?.trim() || org?.name?.trim() || 'your Antarious workspace'
    const inviterName =
      profile?.full_name?.trim() || ctx.user.email?.split('@')[0] || 'A teammate'

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        organization_id: ctx.organizationId,
        email,
        role,
        invited_by: ctx.user.id,
      })
      .select('*')
      .single()

    if (error) throw error

    const mail = await sendTeamInviteEmail({
      to: email,
      businessName,
      inviterName,
      role,
      token: data.token,
    })

    return Response.json(
      {
        invite: data,
        emailSent: mail.ok,
        emailSkipped: !mail.ok && 'skipped' in mail ? Boolean(mail.skipped) : false,
        emailError: mail.ok ? null : mail.error,
      },
      { status: 201 },
    )
  } catch (err) {
    return jsonError(err)
  }
}
