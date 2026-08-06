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
  return process.env.META_GRAPH_VERSION?.trim() || 'v21.0'
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

/** Permissions for Page publish + Messenger + Instagram content/DMs (dev + App Review). */
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
