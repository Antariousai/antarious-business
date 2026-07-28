import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { getCreditBalance, getOrgPlanTier } from '@/lib/entitlements'
import { getAiCreditPack, type AiCreditPackId, type PlanTier } from '@/data/planTiers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    const [
      profileRes,
      bpRes,
      goalsRes,
      platformsRes,
      prefsRes,
      connectionsRes,
      credits,
      planTier,
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url').eq('id', ctx.user.id).maybeSingle(),
      supabase
        .from('business_profiles')
        .select(
          'business_name, industry, customers, business_type, audience_serve, team_size, onboarded',
        )
        .eq('organization_id', ctx.organizationId)
        .maybeSingle(),
      supabase.from('business_goals').select('goal_id').eq('organization_id', ctx.organizationId),
      supabase
        .from('channel_preferences')
        .select('platform')
        .eq('organization_id', ctx.organizationId),
      supabase
        .from('freya_preferences')
        .select('tone, auto_approve, tour_completed, tour_active, tour_step')
        .eq('organization_id', ctx.organizationId)
        .maybeSingle(),
      supabase
        .from('channel_connections')
        .select('platform, status')
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'connected'),
      getCreditBalance(supabase, ctx.organizationId),
      getOrgPlanTier(supabase, ctx.organizationId),
    ])

    const bp = bpRes.data
    const prefs = prefsRes.data

    return Response.json({
      organizationId: ctx.organizationId,
      role: ctx.role,
      email: ctx.user.email,
      profile: {
        ownerName: profileRes.data?.full_name || ctx.user.email?.split('@')[0] || 'You',
        businessName: bp?.business_name ?? '',
        industry: bp?.industry ?? '',
        customers: bp?.customers ?? '',
        businessType: bp?.business_type ?? undefined,
        audienceServe: bp?.audience_serve ?? undefined,
        teamSize: bp?.team_size ?? undefined,
        goals: (goalsRes.data ?? []).map((g) => g.goal_id),
        platforms: (platformsRes.data ?? []).map((p) => p.platform),
        planTier,
      },
      onboarded: Boolean(bp?.onboarded),
      prefs: {
        tone: (prefs?.tone as 'warm' | 'professional' | 'playful') || 'warm',
        autoApprove: Boolean(prefs?.auto_approve),
        connectedPlatforms: (connectionsRes.data ?? []).map((c) => c.platform),
        tourCompleted: Boolean(prefs?.tour_completed),
        tourActive: Boolean(prefs?.tour_active),
        tourStep: prefs?.tour_step ?? 0,
      },
      credits,
      planTier,
      billing: {
        purchasedSeats: 3,
        aiCreditsUsed: 0,
        aiCreditsPurchased: Math.max(0, credits),
      },
    })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()

    if (body.prefs && typeof body.prefs === 'object') {
      const p = body.prefs as Record<string, unknown>
      const patch: Record<string, unknown> = {}
      if ('tone' in p) patch.tone = p.tone
      if ('autoApprove' in p) patch.auto_approve = p.autoApprove
      if ('tourCompleted' in p) patch.tour_completed = p.tourCompleted
      if ('tourActive' in p) patch.tour_active = p.tourActive
      if ('tourStep' in p) patch.tour_step = p.tourStep
      if (Object.keys(patch).length) {
        const { error } = await supabase
          .from('freya_preferences')
          .update(patch)
          .eq('organization_id', ctx.organizationId)
        if (error) throw error
      }
    }

    if (body.profile && typeof body.profile === 'object') {
      const p = body.profile as Record<string, unknown>
      const bpPatch: Record<string, unknown> = {}
      if ('businessName' in p) bpPatch.business_name = p.businessName
      if ('industry' in p) bpPatch.industry = p.industry
      if ('customers' in p) bpPatch.customers = p.customers
      if ('businessType' in p) bpPatch.business_type = p.businessType
      if ('audienceServe' in p) bpPatch.audience_serve = p.audienceServe
      if ('teamSize' in p) bpPatch.team_size = p.teamSize
      if (Object.keys(bpPatch).length) {
        const { error } = await supabase
          .from('business_profiles')
          .update(bpPatch)
          .eq('organization_id', ctx.organizationId)
        if (error) throw error
      }
      if ('ownerName' in p) {
        await supabase
          .from('profiles')
          .update({ full_name: String(p.ownerName) })
          .eq('id', ctx.user.id)
      }
      if (Array.isArray(p.goals)) {
        await supabase.from('business_goals').delete().eq('organization_id', ctx.organizationId)
        const goals = p.goals.map(String)
        if (goals.length) {
          await supabase.from('business_goals').insert(
            goals.map((goal_id) => ({ organization_id: ctx.organizationId, goal_id })),
          )
        }
      }
      if (Array.isArray(p.platforms)) {
        await supabase
          .from('channel_preferences')
          .delete()
          .eq('organization_id', ctx.organizationId)
        const platforms = p.platforms.map(String)
        if (platforms.length) {
          await supabase.from('channel_preferences').insert(
            platforms.map((platform) => ({ organization_id: ctx.organizationId, platform })),
          )
        }
      }
      if ('planTier' in p) {
        await supabase
          .from('subscriptions')
          .update({ plan_tier: p.planTier as PlanTier })
          .eq('organization_id', ctx.organizationId)
      }
    }

    if (body.connectPlatform) {
      const platform = String(body.connectPlatform)
      const { error } = await supabase.from('channel_connections').upsert(
        {
          organization_id: ctx.organizationId,
          platform,
          status: 'connected',
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,platform' },
      )
      if (error) throw error
    }

    if (body.disconnectPlatform) {
      const platform = String(body.disconnectPlatform)
      await supabase
        .from('channel_connections')
        .update({ status: 'disconnected', connected_at: null })
        .eq('organization_id', ctx.organizationId)
        .eq('platform', platform)
    }

    if (body.buyCreditPack) {
      const pack = getAiCreditPack(body.buyCreditPack as AiCreditPackId)
      if (pack) {
        await supabase.from('ai_credit_ledger').insert({
          organization_id: ctx.organizationId,
          delta: pack.credits,
          reason: `purchase_${pack.id}`,
          created_by: ctx.user.id,
        })
      }
    }

    return Response.json({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
