import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { getCreditBalance, getOrgPlanTier } from '@/lib/entitlements'
import { getAiCreditPack, type AiCreditPackId, type PlanTier } from '@/data/planTiers'
import {
  applyBusinessProfilePatch,
  signedBrandUrl,
} from '@/lib/org/updateBusinessProfile'

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
          'business_name, industry, customers, business_type, audience_serve, team_size, onboarded, cover_path, logo_path',
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
        .select('platform, status, page_url, page_name, provider, external_page_id')
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'connected'),
      getCreditBalance(supabase, ctx.organizationId),
      getOrgPlanTier(supabase, ctx.organizationId),
    ])

    // If newer Meta columns aren’t applied yet, fall back so connections still load.
    let connectionRows: Array<Record<string, unknown>> = (connectionsRes.data ??
      []) as Array<Record<string, unknown>>
    if (connectionsRes.error) {
      const fallback = await supabase
        .from('channel_connections')
        .select('platform, status, page_url')
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'connected')
      if (fallback.error) {
        const bare = await supabase
          .from('channel_connections')
          .select('platform, status')
          .eq('organization_id', ctx.organizationId)
          .eq('status', 'connected')
        connectionRows = (bare.data ?? []) as Array<Record<string, unknown>>
      } else {
        connectionRows = (fallback.data ?? []) as Array<Record<string, unknown>>
      }
    }

    const bp = bpRes.data
    const prefs = prefsRes.data
    const [coverUrl, logoUrl] = await Promise.all([
      signedBrandUrl(supabase, bp?.cover_path),
      signedBrandUrl(supabase, bp?.logo_path),
    ])

    const connectedChannels = connectionRows.map((c) => {
      const platform = String(c.platform ?? '')
      const pageUrl = typeof c.page_url === 'string' ? c.page_url : ''
      const pageName = typeof c.page_name === 'string' ? c.page_name : ''
      const provider = typeof c.provider === 'string' ? c.provider : ''
      const externalPageId = typeof c.external_page_id === 'string' ? c.external_page_id : ''
      return {
        platform,
        pageUrl,
        pageName,
        provider,
        connectedViaMeta: provider === 'meta' || Boolean(externalPageId),
      }
    })

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
        coverPath: bp?.cover_path ?? undefined,
        logoPath: bp?.logo_path ?? undefined,
        coverUrl,
        logoUrl,
      },
      onboarded: Boolean(bp?.onboarded),
      prefs: {
        tone: (prefs?.tone as 'warm' | 'professional' | 'playful') || 'warm',
        autoApprove: Boolean(prefs?.auto_approve),
        connectedPlatforms: connectedChannels.map((c) => c.platform),
        connectedChannels,
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
      await applyBusinessProfilePatch(supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        patch: {
          ownerName: 'ownerName' in p ? String(p.ownerName) : undefined,
          businessName: 'businessName' in p ? String(p.businessName) : undefined,
          industry: 'industry' in p ? String(p.industry) : undefined,
          customers: 'customers' in p ? String(p.customers) : undefined,
          businessType: 'businessType' in p ? (p.businessType as string | null) : undefined,
          audienceServe: 'audienceServe' in p ? (p.audienceServe as string | null) : undefined,
          teamSize: 'teamSize' in p ? (p.teamSize as string | null) : undefined,
          goals: Array.isArray(p.goals) ? p.goals.map(String) : undefined,
          platforms: Array.isArray(p.platforms) ? p.platforms.map(String) : undefined,
          planTier: 'planTier' in p ? (p.planTier as PlanTier) : undefined,
          coverPath: 'coverPath' in p ? (p.coverPath as string | null) : undefined,
          logoPath: 'logoPath' in p ? (p.logoPath as string | null) : undefined,
        },
      })
    }

    if (body.connectPlatform) {
      const platform = String(body.connectPlatform)
      const pageUrl =
        typeof body.pageUrl === 'string' && body.pageUrl.trim() ? body.pageUrl.trim() : null
      const row: Record<string, unknown> = {
        organization_id: ctx.organizationId,
        platform,
        status: 'connected',
        connected_at: new Date().toISOString(),
      }
      if (pageUrl) row.page_url = pageUrl
      let { error } = await supabase
        .from('channel_connections')
        .upsert(row, { onConflict: 'organization_id,platform' })
      // DB without page_url column yet
      if (error && pageUrl) {
        delete row.page_url
        ;({ error } = await supabase
          .from('channel_connections')
          .upsert(row, { onConflict: 'organization_id,platform' }))
      }
      if (error) throw error
    }

    if (body.updateChannelPageUrl && typeof body.updateChannelPageUrl === 'object') {
      const platform = String(
        (body.updateChannelPageUrl as { platform?: string }).platform || '',
      )
      const pageUrlRaw = (body.updateChannelPageUrl as { pageUrl?: string }).pageUrl
      const pageUrl =
        typeof pageUrlRaw === 'string' && pageUrlRaw.trim() ? pageUrlRaw.trim() : null
      if (platform) {
        const { error } = await supabase
          .from('channel_connections')
          .update({ page_url: pageUrl })
          .eq('organization_id', ctx.organizationId)
          .eq('platform', platform)
        if (error) throw error
      }
    }

    if (body.disconnectPlatform) {
      const platform = String(body.disconnectPlatform)
      await supabase
        .from('channel_connections')
        .update({
          status: 'disconnected',
          connected_at: null,
          page_url: null,
          provider: null,
          external_page_id: null,
          external_ig_user_id: null,
          page_name: null,
          access_token: null,
          token_expires_at: null,
          scopes: null,
          meta_user_id: null,
        })
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
