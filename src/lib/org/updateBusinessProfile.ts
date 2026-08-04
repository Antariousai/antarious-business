import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanTier } from '@/data/planTiers'

export type BusinessProfilePatch = {
  ownerName?: string | null
  businessName?: string | null
  industry?: string | null
  customers?: string | null
  businessType?: string | null
  audienceServe?: string | null
  teamSize?: string | null
  goals?: string[] | null
  platforms?: string[] | null
  planTier?: PlanTier | string | null
  /** Supabase storage path in post-media bucket (or null to clear) */
  coverPath?: string | null
  logoPath?: string | null
}

export type ApplyProfileResult = {
  ok: true
  updated: string[]
  profile: {
    ownerName?: string
    businessName?: string
    industry?: string
    customers?: string
    businessType?: string | null
    audienceServe?: string | null
    teamSize?: string | null
    goals?: string[]
    platforms?: string[]
    planTier?: string
    coverPath?: string | null
    logoPath?: string | null
  }
}

/**
 * Shared write path for Settings (PATCH /api/me), Freya tools, and any
 * post-onboarding corrections. Scopes everything to the given org.
 */
export async function applyBusinessProfilePatch(
  supabase: SupabaseClient,
  opts: {
    organizationId: string
    userId: string
    patch: BusinessProfilePatch
  },
): Promise<ApplyProfileResult> {
  const { organizationId, userId, patch } = opts
  const updated: string[] = []
  const profile: ApplyProfileResult['profile'] = {}

  const bpPatch: Record<string, unknown> = {}
  if (patch.businessName != null) {
    bpPatch.business_name = String(patch.businessName).trim()
    profile.businessName = String(bpPatch.business_name)
    updated.push('businessName')
  }
  if (patch.industry != null) {
    bpPatch.industry = String(patch.industry).trim()
    profile.industry = String(bpPatch.industry)
    updated.push('industry')
  }
  if (patch.customers != null) {
    bpPatch.customers = String(patch.customers).trim()
    profile.customers = String(bpPatch.customers)
    updated.push('customers')
  }
  if (patch.businessType !== undefined) {
    bpPatch.business_type = patch.businessType
    profile.businessType = patch.businessType
    updated.push('businessType')
  }
  if (patch.audienceServe !== undefined) {
    bpPatch.audience_serve = patch.audienceServe
    profile.audienceServe = patch.audienceServe
    updated.push('audienceServe')
  }
  if (patch.teamSize !== undefined) {
    bpPatch.team_size = patch.teamSize
    profile.teamSize = patch.teamSize
    updated.push('teamSize')
  }
  if (patch.coverPath !== undefined) {
    bpPatch.cover_path = patch.coverPath
    profile.coverPath = patch.coverPath
    updated.push('coverPath')
  }
  if (patch.logoPath !== undefined) {
    bpPatch.logo_path = patch.logoPath
    profile.logoPath = patch.logoPath
    updated.push('logoPath')
  }

  if (Object.keys(bpPatch).length) {
    const { error } = await supabase
      .from('business_profiles')
      .update(bpPatch)
      .eq('organization_id', organizationId)
    if (error) throw error
  }

  if (patch.businessName != null && String(patch.businessName).trim()) {
    await supabase
      .from('organizations')
      .update({ name: String(patch.businessName).trim() })
      .eq('id', organizationId)
  }

  if (patch.ownerName != null && String(patch.ownerName).trim()) {
    const fullName = String(patch.ownerName).trim()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId)
    if (error) throw error
    profile.ownerName = fullName
    updated.push('ownerName')
  }

  if (Array.isArray(patch.goals)) {
    const goals = patch.goals.map(String).filter(Boolean)
    await supabase.from('business_goals').delete().eq('organization_id', organizationId)
    if (goals.length) {
      const { error } = await supabase.from('business_goals').insert(
        goals.map((goal_id) => ({ organization_id: organizationId, goal_id })),
      )
      if (error) throw error
    }
    profile.goals = goals
    updated.push('goals')
  }

  if (Array.isArray(patch.platforms)) {
    const platforms = patch.platforms.map(String).filter(Boolean)
    await supabase.from('channel_preferences').delete().eq('organization_id', organizationId)
    if (platforms.length) {
      const { error } = await supabase.from('channel_preferences').insert(
        platforms.map((platform) => ({ organization_id: organizationId, platform })),
      )
      if (error) throw error
    }
    profile.platforms = platforms
    updated.push('platforms')
  }

  if (patch.planTier != null && String(patch.planTier).trim()) {
    const planTier = String(patch.planTier).trim()
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan_tier: planTier })
      .eq('organization_id', organizationId)
    if (error) throw error
    profile.planTier = planTier
    updated.push('planTier')
  }

  return { ok: true, updated, profile }
}

/** Signed URL for a path in the post-media bucket (30 days). */
export async function signedBrandUrl(
  supabase: SupabaseClient,
  path: string | null | undefined,
): Promise<string | undefined> {
  if (!path) return undefined
  const { data, error } = await supabase.storage
    .from('post-media')
    .createSignedUrl(path, 60 * 60 * 24 * 30)
  if (error || !data?.signedUrl) return undefined
  return data.signedUrl
}
