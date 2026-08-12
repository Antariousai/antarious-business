import type { Platform } from '@/data/mockData'

export const META_OAUTH_PLATFORMS: Platform[] = ['Facebook', 'Instagram', 'Messenger']

export function isMetaOAuthPlatform(platform: string): platform is Platform {
  return (META_OAUTH_PLATFORMS as string[]).includes(platform)
}

export function metaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim())
}

export function metaAppId(): string {
  const id = process.env.META_APP_ID?.trim()
  if (!id) throw new Error('META_APP_ID is not set')
  return id
}

export function metaAppSecret(): string {
  const secret = process.env.META_APP_SECRET?.trim()
  if (!secret) throw new Error('META_APP_SECRET is not set')
  return secret
}

export function metaGraphVersion(): string {
  return process.env.META_GRAPH_VERSION?.trim() || process.env.META_GRAPH_API_VERSION?.trim() || 'v21.0'
}

export function metaWebhookVerifyToken(): string {
  return process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() || ''
}

export function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    ''
  if (!raw) return 'http://localhost:3000'
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '')
  return `https://${raw.replace(/\/$/, '')}`
}

export function metaOAuthRedirectUri(): string {
  return `${appBaseUrl()}/api/meta/oauth/callback`
}

/** Instagram Business Login (API with Instagram Login) redirect. */
export function instagramOAuthRedirectUri(): string {
  return `${appBaseUrl()}/api/meta/instagram/oauth/callback`
}

/**
 * Facebook Login scopes for Page + Messenger (+ Page-linked IG).
 * Distinct from Instagram Business Login scopes.
 */
export function metaOAuthScopes(): string {
  const override = process.env.META_OAUTH_SCOPES?.trim()
  if (override) return override
  return [
    'pages_show_list',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_messaging',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_messages',
    'business_management',
  ].join(',')
}

/** Instagram API with Instagram Login scopes (matches Developer Dashboard Business permissions). */
export function instagramBusinessLoginScopes(): string {
  const override = process.env.META_IG_LOGIN_SCOPES?.trim()
  if (override) return override
  return [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_content_publish',
    'instagram_business_manage_comments',
    'instagram_business_manage_insights',
  ].join(',')
}

/** Prefer Instagram Business Login for the Instagram Connect button when configured. */
export function preferInstagramBusinessLogin(): boolean {
  const flag = process.env.META_IG_LOGIN_ENABLED?.trim().toLowerCase()
  if (flag === '0' || flag === 'false') return false
  return metaConfigured()
}
