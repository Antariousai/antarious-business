import {
  instagramBusinessLoginScopes,
  instagramOAuthRedirectUri,
  metaAppId,
  metaAppSecret,
  metaGraphVersion,
} from '@/lib/meta/config'

export function buildInstagramAuthorizeUrl(state: string): string {
  const url = new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', metaAppId())
  url.searchParams.set('redirect_uri', instagramOAuthRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', instagramBusinessLoginScopes())
  url.searchParams.set('state', state)
  // Force re-consent when reconnecting in development
  url.searchParams.set('enable_fb_login', '0')
  return url.toString()
}

export async function exchangeInstagramCode(code: string): Promise<{
  accessToken: string
  userId: string
}> {
  const body = new URLSearchParams()
  body.set('client_id', metaAppId())
  body.set('client_secret', metaAppSecret())
  body.set('grant_type', 'authorization_code')
  body.set('redirect_uri', instagramOAuthRedirectUri())
  body.set('code', code)

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as {
    access_token?: string
    user_id?: number | string
    error_message?: string
    error_type?: string
  }
  if (!res.ok || !json.access_token || json.user_id == null) {
    throw new Error(json.error_message || 'Failed to exchange Instagram OAuth code')
  }
  return { accessToken: json.access_token, userId: String(json.user_id) }
}

/** Exchange short-lived IG User token for long-lived (~60 days). */
export async function exchangeInstagramLongLivedToken(shortLived: string): Promise<{
  accessToken: string
  expiresIn: number | null
}> {
  const url = new URL(`https://graph.instagram.com/access_token`)
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', metaAppSecret())
  url.searchParams.set('access_token', shortLived)
  const res = await fetch(url.toString())
  const json = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: { message?: string }
  }
  if (!res.ok || !json.access_token) {
    // Fall back to short-lived if exchange fails
    console.warn(
      JSON.stringify({
        event: 'meta.token.refresh_failed',
        provider: 'instagram',
        message: json.error?.message || 'long-lived exchange failed',
        graphVersion: metaGraphVersion(),
      }),
    )
    return { accessToken: shortLived, expiresIn: null }
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? null }
}
