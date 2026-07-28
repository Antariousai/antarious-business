import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonError } from '@/lib/org/context'
import { EntitlementError } from '@/lib/entitlements'

export const runtime = 'nodejs'

/**
 * Accept a team invitation by token.
 *
 * The invitee is not yet an org member, so the invite lookup + membership
 * insert use the service-role admin client (RLS would otherwise block reading
 * another org's invitation and inserting a membership as a non-owner).
 *
 * The caller MUST be authenticated — we bind the membership to their user id
 * and require their email to match the invited address.
 */
async function acceptInvite(token: string) {
  if (!token) throw new EntitlementError('token required', 'ORG')

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new EntitlementError('Sign in to accept the invite', 'AUTH')

  const admin = createAdminClient()

  const { data: invite, error } = await admin
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()
  if (error) throw error
  if (!invite) throw new EntitlementError('Invite not found', 'ORG')
  if (invite.accepted_at) throw new EntitlementError('Invite already used', 'ORG')
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new EntitlementError('Invite expired', 'ORG')
  }

  const userEmail = (user.email ?? '').toLowerCase()
  if (invite.email && userEmail && invite.email.toLowerCase() !== userEmail) {
    throw new EntitlementError('Invite was sent to a different email', 'ORG')
  }

  // Enforce seat cap (Scale MVP default: 5) using an admin count.
  const { count } = await admin
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', invite.organization_id)
  if ((count ?? 0) >= 5) {
    // Already a member? Then treat as success (idempotent).
    const { data: existing } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!existing) throw new EntitlementError('Seat limit reached', 'SEATS')
  }

  await admin
    .from('organization_members')
    .upsert(
      {
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role,
      },
      { onConflict: 'organization_id,user_id' },
    )

  await admin
    .from('team_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { organizationId: invite.organization_id as string, role: invite.role as string }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body.token ?? '')
    const result = await acceptInvite(token)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    return jsonError(err)
  }
}

// GET lets an emailed link (…/api/team/invites/accept?token=…) work directly.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  try {
    await acceptInvite(token)
    return Response.redirect(new URL('/app?invite=accepted', url.origin), 303)
  } catch (err) {
    if (err instanceof EntitlementError && err.code === 'AUTH') {
      // Bounce to login, preserving the token so the user can retry after sign-in.
      return Response.redirect(
        new URL(`/?invite=${encodeURIComponent(token)}`, url.origin),
        303,
      )
    }
    return jsonError(err)
  }
}
