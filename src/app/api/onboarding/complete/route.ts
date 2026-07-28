import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { recommendPlanTier, type TeamSize } from '@/data/planTiers'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()

    const businessName = String(body.businessName ?? '').trim()
    const industry = String(body.industry ?? '').trim()
    const customers = String(body.customers ?? '').trim()
    const businessType = body.businessType ? String(body.businessType) : null
    const audienceServe = body.audienceServe ? String(body.audienceServe) : null
    const teamSize = (body.teamSize as TeamSize) || 'solo'
    const goals: string[] = Array.isArray(body.goals) ? body.goals.map(String) : []
    const platforms: string[] = Array.isArray(body.platforms) ? body.platforms.map(String) : []
    const planTier = body.planTier || recommendPlanTier(teamSize)

    const { error: bpError } = await supabase
      .from('business_profiles')
      .update({
        business_name: businessName,
        industry,
        customers,
        business_type: businessType,
        audience_serve: audienceServe,
        team_size: teamSize,
        onboarded: true,
      })
      .eq('organization_id', ctx.organizationId)

    if (bpError) throw bpError

    await supabase.from('business_goals').delete().eq('organization_id', ctx.organizationId)
    if (goals.length) {
      await supabase.from('business_goals').insert(
        goals.map((goal_id) => ({ organization_id: ctx.organizationId, goal_id })),
      )
    }

    await supabase.from('channel_preferences').delete().eq('organization_id', ctx.organizationId)
    if (platforms.length) {
      await supabase.from('channel_preferences').insert(
        platforms.map((platform) => ({ organization_id: ctx.organizationId, platform })),
      )
    }

    await supabase
      .from('subscriptions')
      .update({ plan_tier: planTier })
      .eq('organization_id', ctx.organizationId)

    await supabase
      .from('freya_preferences')
      .update({ tour_active: true, tour_step: 0, tour_completed: false })
      .eq('organization_id', ctx.organizationId)

    if (body.ownerName) {
      await supabase
        .from('profiles')
        .update({ full_name: String(body.ownerName) })
        .eq('id', ctx.user.id)
    }

    await supabase
      .from('organizations')
      .update({ name: businessName || 'My business' })
      .eq('id', ctx.organizationId)

    return Response.json({ ok: true, planTier, organizationId: ctx.organizationId })
  } catch (err) {
    return jsonError(err)
  }
}
