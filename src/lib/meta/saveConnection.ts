import type { SupabaseClient } from '@supabase/supabase-js'
import { getEntitlements, getOrgPlanTier } from '@/lib/entitlements'
import type { PendingMetaPage } from './oauthState'
import { metaOAuthScopes, instagramBusinessLoginScopes } from './config'
import { encryptSecret } from '@/lib/integrations/crypto/tokenEncryption'

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
  external_page_id: string | null
  external_ig_user_id: string | null
  page_name: string
  page_url: string
  access_token: string | null
  access_token_enc: string
  token_kind: string
  token_expires_at: string | null
  scopes: string
  meta_user_id: string | null
  last_error: null
  metadata: Record<string, unknown>
}

function sealToken(token: string): { access_token: string | null; access_token_enc: string } {
  const access_token_enc = encryptSecret(token)
  if (access_token_enc.startsWith('v1:')) {
    return { access_token: null, access_token_enc }
  }
  return { access_token: token, access_token_enc }
}

/**
 * Persist Page token for Meta platforms without exceeding plan channel slots.
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
  const sealed = sealToken(page.accessToken)

  const base = {
    organization_id: organizationId,
    status: 'connected' as const,
    connected_at: now,
    provider: 'meta',
    external_page_id: page.id,
    external_ig_user_id: page.igUserId,
    ...sealed,
    token_kind: 'page',
    token_expires_at: null as string | null,
    scopes,
    meta_user_id: opts?.metaUserId ?? null,
    last_error: null,
    metadata: {} as Record<string, unknown>,
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

  const rows: ConnectionRow[] = []
  let slotsUsed = connected.size

  for (const row of candidates) {
    const already = connected.has(row.platform) || rows.some((r) => r.platform === row.platform)
    if (already) {
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

/** Persist Instagram Business Login (IG user token) connection. */
export async function saveInstagramUserConnection(
  supabase: SupabaseClient,
  organizationId: string,
  account: {
    igUserId: string
    username: string | null
    accessToken: string
    expiresAt: string | null
    metaUserId?: string | null
  },
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

  if (!connected.has('Instagram') && connected.size >= max) {
    throw new Error(
      `Your plan allows ${max} connected channel${max === 1 ? '' : 's'}. Disconnect one or upgrade, then try again.`,
    )
  }

  const now = new Date().toISOString()
  const sealed = sealToken(account.accessToken)
  const pageName = account.username ? `@${account.username}` : 'Instagram'
  const pageUrl = account.username
    ? `https://www.instagram.com/${account.username}`
    : 'https://www.instagram.com/'

  const row = {
    organization_id: organizationId,
    platform: 'Instagram',
    status: 'connected' as const,
    connected_at: now,
    provider: 'meta',
    external_page_id: null,
    external_ig_user_id: account.igUserId,
    page_name: pageName,
    page_url: pageUrl,
    ...sealed,
    token_kind: 'instagram_user',
    token_expires_at: account.expiresAt,
    scopes: instagramBusinessLoginScopes(),
    meta_user_id: account.metaUserId ?? null,
    last_error: null,
    last_synced_at: now,
    metadata: { auth: 'instagram_business_login' },
  }

  const { error } = await supabase.from('channel_connections').upsert(row, {
    onConflict: 'organization_id,platform',
  })
  if (error) throw new Error(error.message)

  console.info(
    JSON.stringify({
      event: 'meta.oauth.completed',
      provider: 'instagram',
      organizationId,
      igUserId: account.igUserId,
      username: account.username,
    }),
  )

  return {
    platforms: ['Instagram'],
    pageName,
    pageUrl,
    hasInstagram: true,
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
      access_token_enc: null,
      token_kind: null,
      token_expires_at: null,
      scopes: null,
      meta_user_id: null,
      last_error: null,
      metadata: {},
    })
    .eq('organization_id', organizationId)
    .eq('platform', platform)
  if (error) throw new Error(error.message)
}
