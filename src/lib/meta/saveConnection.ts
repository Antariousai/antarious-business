import type { SupabaseClient } from '@supabase/supabase-js'
import { getEntitlements, getOrgPlanTier } from '@/lib/entitlements'
import type { PendingMetaPage } from './oauthState'
import { metaOAuthScopes } from './config'

export type SaveMetaConnectionResult = {
  platforms: string[]
  pageName: string
  pageUrl: string
  hasInstagram: boolean
}

type ConnectionRow = {
  organization_id: string
  platform: string
  status: 'connected'
  connected_at: string
  provider: string
  external_page_id: string
  external_ig_user_id: string | null
  page_name: string
  page_url: string
  access_token: string
  token_expires_at: null
  scopes: string
  meta_user_id: string | null
}

/**
 * Persist Page token for Meta platforms without exceeding plan channel slots.
 * Priority: always Facebook (token home) → requested platform → Instagram if linked → Messenger.
 * Never return the token to callers.
 */
export async function saveMetaPageConnection(
  supabase: SupabaseClient,
  organizationId: string,
  page: PendingMetaPage,
  opts?: { metaUserId?: string | null; requestedPlatform?: string },
): Promise<SaveMetaConnectionResult> {
  const tier = await getOrgPlanTier(supabase, organizationId)
  const max = getEntitlements(tier).maxChannels

  const { data: existing } = await supabase
    .from('channel_connections')
    .select('platform, status')
    .eq('organization_id', organizationId)

  const connected = new Set(
    (existing ?? [])
      .filter((r) => r.status === 'connected')
      .map((r) => String(r.platform)),
  )

  const now = new Date().toISOString()
  const scopes = metaOAuthScopes()
  const fbUrl = page.pageUrl
  const igUrl = page.igUsername
    ? `https://www.instagram.com/${page.igUsername}`
    : fbUrl
  const requested = opts?.requestedPlatform || 'Facebook'

  const base = {
    organization_id: organizationId,
    status: 'connected' as const,
    connected_at: now,
    provider: 'meta',
    external_page_id: page.id,
    external_ig_user_id: page.igUserId,
    access_token: page.accessToken,
    token_expires_at: null,
    scopes,
    meta_user_id: opts?.metaUserId ?? null,
  }

  const candidates: ConnectionRow[] = [
    {
      ...base,
      platform: 'Facebook',
      page_name: page.name,
      page_url: fbUrl,
    },
  ]

  if (requested === 'Messenger') {
    candidates.push({
      ...base,
      platform: 'Messenger',
      page_name: page.name,
      page_url: fbUrl,
    })
  }

  if (page.igUserId && (requested === 'Instagram' || requested !== 'Messenger')) {
    candidates.push({
      ...base,
      platform: 'Instagram',
      page_name: page.igUsername ? `@${page.igUsername}` : page.name,
      page_url: igUrl,
    })
  }

  if (requested !== 'Messenger') {
    candidates.push({
      ...base,
      platform: 'Messenger',
      page_name: page.name,
      page_url: fbUrl,
    })
  }

  // If user asked Instagram but no IG linked, still keep Facebook.
  if (requested === 'Instagram' && !page.igUserId) {
    // already have Facebook; nothing else required
  }

  const rows: ConnectionRow[] = []
  let slotsUsed = connected.size

  for (const row of candidates) {
    const already = connected.has(row.platform) || rows.some((r) => r.platform === row.platform)
    if (already) {
      // Reconnect / refresh token always allowed
      if (!rows.some((r) => r.platform === row.platform)) rows.push(row)
      continue
    }
    if (slotsUsed >= max) continue
    rows.push(row)
    slotsUsed += 1
  }

  if (!rows.length) {
    throw new Error(
      `Your plan allows ${max} connected channel${max === 1 ? '' : 's'}. Disconnect one or upgrade, then try again.`,
    )
  }

  // Ensure Facebook is always included when any Meta row is saved (token canonical home),
  // even if it means replacing a weaker candidate — Facebook should be first candidate.
  if (!rows.some((r) => r.platform === 'Facebook')) {
    const fb = candidates.find((c) => c.platform === 'Facebook')
    if (fb) {
      if (rows.length >= max) rows.pop()
      rows.unshift(fb)
    }
  }

  const { error } = await supabase.from('channel_connections').upsert(rows, {
    onConflict: 'organization_id,platform',
  })
  if (error) throw new Error(error.message)

  return {
    platforms: rows.map((r) => r.platform),
    pageName: page.name,
    pageUrl: fbUrl,
    hasInstagram: rows.some((r) => r.platform === 'Instagram'),
  }
}

export async function clearMetaConnection(
  supabase: SupabaseClient,
  organizationId: string,
  platform: string,
) {
  const { error } = await supabase
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
    .eq('organization_id', organizationId)
    .eq('platform', platform)
  if (error) throw new Error(error.message)
}
