import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { getCreditBalance, getOrgPlanTier } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const [
      waiting,
      overdueInvoices,
      todaysPosts,
      recentActivity,
      credits,
      planTier,
    ] = await Promise.all([
      supabase
        .from('freya_activity_items')
        .select('*', { count: 'exact' })
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('money_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'overdue'),
      supabase
        .from('content_posts')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString()),
      supabase
        .from('freya_activity_items')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
        .limit(8),
      getCreditBalance(supabase, ctx.organizationId),
      getOrgPlanTier(supabase, ctx.organizationId),
    ])

    return Response.json({
      waitingApprovals: waiting.data ?? [],
      waitingCount: waiting.count ?? 0,
      overdueInvoices: overdueInvoices.count ?? 0,
      todaysPosts: todaysPosts.data ?? [],
      recentActivity: recentActivity.data ?? [],
      credits,
      planTier,
    })
  } catch (err) {
    return jsonError(err)
  }
}
