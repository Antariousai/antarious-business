import type { SupabaseClient, User } from '@supabase/supabase-js'
import { EntitlementError } from '@/lib/entitlements'

export type OrgContext = {
  user: User
  organizationId: string
  role: string
}

/** Resolve the caller's primary organization (first membership). */
export async function requireOrgContext(
  supabase: SupabaseClient,
): Promise<OrgContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new EntitlementError('Not authenticated', 'AUTH')
  }

  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !membership) {
    throw new EntitlementError('No organization membership', 'ORG')
  }

  return {
    user,
    organizationId: membership.organization_id as string,
    role: membership.role as string,
  }
}

export function jsonError(err: unknown, fallback = 500) {
  if (err instanceof EntitlementError) {
    const status =
      err.code === 'AUTH'
        ? 401
        : err.code === 'ORG'
          ? 403
          : err.code === 'CREDITS'
            ? 402
            : err.code === 'RATE_LIMIT'
              ? 429
              : 403
    return Response.json({ error: err.message, code: err.code }, { status })
  }
  const message = err instanceof Error ? err.message : 'Server error'
  return Response.json({ error: message }, { status: fallback })
}
