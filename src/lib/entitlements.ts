/**
 * Server-authoritative plan gates (ported from planTiers + TierGate).
 * Use these in route handlers / middleware — never trust client alone.
 */
import {
  PLAN_TIERS,
  canAccessModule,
  canAccessPath,
  getEntitlements,
  type AppModule,
  type PlanTier,
} from '@/data/planTiers'
import type { SupabaseClient } from '@supabase/supabase-js'

export { canAccessModule, canAccessPath, getEntitlements, PLAN_TIERS }
export type { AppModule, PlanTier }

export class EntitlementError extends Error {
  constructor(
    message: string,
    public code:
      | 'PLAN'
      | 'CREDITS'
      | 'CHANNELS'
      | 'SEATS'
      | 'AUTH'
      | 'ORG'
      | 'RATE_LIMIT' = 'PLAN',
  ) {
    super(message)
    this.name = 'EntitlementError'
  }
}

export async function getOrgPlanTier(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<PlanTier> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_tier')
    .eq('organization_id', organizationId)
    .maybeSingle()
  return (data?.plan_tier as PlanTier) ?? 'starter'
}

export async function assertModuleAccess(
  supabase: SupabaseClient,
  organizationId: string,
  module: AppModule,
) {
  const tier = await getOrgPlanTier(supabase, organizationId)
  if (!canAccessModule(tier, module)) {
    throw new EntitlementError(
      `Plan ${tier} cannot access module ${module}`,
      'PLAN',
    )
  }
  return tier
}

export async function getCreditBalance(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('credit_balance', { org: organizationId })
  if (error) {
    // Fallback if RPC unavailable
    const { data: rows } = await supabase
      .from('ai_credit_ledger')
      .select('delta')
      .eq('organization_id', organizationId)
    return (rows ?? []).reduce((s: number, r: { delta: number }) => s + (r.delta ?? 0), 0)
  }
  return Number(data ?? 0)
}

/** Debit credits before an agent run. Rejects if insufficient. */
export async function spendCredits(
  supabase: SupabaseClient,
  opts: {
    organizationId: string
    amount: number
    reason: string
    userId?: string | null
    refId?: string
  },
): Promise<number> {
  const need = Math.max(1, Math.floor(opts.amount))
  const balance = await getCreditBalance(supabase, opts.organizationId)
  if (balance < need) {
    throw new EntitlementError(
      `Need ${need} credits, have ${balance}`,
      'CREDITS',
    )
  }
  const { error } = await supabase.from('ai_credit_ledger').insert({
    organization_id: opts.organizationId,
    delta: -need,
    reason: opts.reason,
    ref_id: opts.refId ?? null,
    created_by: opts.userId ?? null,
  })
  if (error) throw new EntitlementError(error.message, 'CREDITS')
  return balance - need
}

export async function assertChannelSlot(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const tier = await getOrgPlanTier(supabase, organizationId)
  const max = getEntitlements(tier).maxChannels
  const { count } = await supabase
    .from('channel_connections')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'connected')
  if ((count ?? 0) >= max) {
    throw new EntitlementError(
      `Plan ${tier} allows ${max} channels`,
      'CHANNELS',
    )
  }
}

export async function assertSeatAvailable(
  supabase: SupabaseClient,
  organizationId: string,
  seatLimit: number,
) {
  const { count } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
  if ((count ?? 0) >= seatLimit) {
    throw new EntitlementError('Seat limit reached', 'SEATS')
  }
}

const PATH_TO_MODULE: Record<string, AppModule> = {
  '/app': 'today',
  '/app/content': 'posts',
  '/app/campaigns': 'campaigns',
  '/app/leads': 'leads',
  '/app/pipeline': 'customers',
  '/app/inbox': 'messages',
  '/app/money': 'money',
  '/app/discover': 'ideas',
  '/app/templates': 'templates',
  '/app/team': 'team',
  '/app/settings': 'settings',
}

export function resolveModuleForPath(pathname: string): AppModule | null {
  const key = Object.keys(PATH_TO_MODULE)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || (k !== '/app' && pathname.startsWith(k)))
  return key ? PATH_TO_MODULE[key] : null
}
