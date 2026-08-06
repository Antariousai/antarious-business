import { metaAppId, metaAppSecret, metaGraphVersion, metaOAuthRedirectUri, metaOAuthScopes } from './config'
import type { PendingMetaPage } from './oauthState'

const graphBase = () => `https://graph.facebook.com/${metaGraphVersion()}`

export function buildMetaAuthorizeUrl(state: string): string {
  const url = new URL(`https://www.facebook.com/${metaGraphVersion()}/dialog/oauth`)
  url.searchParams.set('client_id', metaAppId())
  url.searchParams.set('redirect_uri', metaOAuthRedirectUri())
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', metaOAuthScopes())
  return url.toString()
}

export async function exchangeCodeForUserToken(code: string): Promise<{
  accessToken: string
  expiresIn: number | null
}> {
  const url = new URL(`${graphBase()}/oauth/access_token`)
  url.searchParams.set('client_id', metaAppId())
  url.searchParams.set('client_secret', metaAppSecret())
  url.searchParams.set('redirect_uri', metaOAuthRedirectUri())
  url.searchParams.set('code', code)

  const res = await fetch(url.toString())
  const json = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: { message?: string }
  }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message || 'Failed to exchange Meta OAuth code')
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? null }
}

export async function fetchMetaUserId(userToken: string): Promise<string> {
  const url = new URL(`${graphBase()}/me`)
  url.searchParams.set('fields', 'id')
  url.searchParams.set('access_token', userToken)
  const res = await fetch(url.toString())
  const json = (await res.json()) as { id?: string; error?: { message?: string } }
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || 'Failed to load Meta user')
  }
  return json.id
}

type GraphPage = {
  id: string
  name?: string
  access_token?: string
  instagram_business_account?: { id?: string; username?: string }
}

export async function fetchManagedPages(userToken: string): Promise<PendingMetaPage[]> {
  const url = new URL(`${graphBase()}/me/accounts`)
  url.searchParams.set(
    'fields',
    'id,name,access_token,instagram_business_account{id,username}',
  )
  url.searchParams.set('limit', '50')
  url.searchParams.set('access_token', userToken)

  const res = await fetch(url.toString())
  const json = (await res.json()) as {
    data?: GraphPage[]
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to list Facebook Pages')
  }

  return (json.data ?? [])
    .filter((p) => p.id && p.access_token)
    .map((p) => {
      const username = p.instagram_business_account?.username || null
      return {
        id: p.id,
        name: p.name || `Page ${p.id}`,
        accessToken: p.access_token as string,
        igUserId: p.instagram_business_account?.id || null,
        igUsername: username,
        pageUrl: `https://www.facebook.com/${p.id}`,
      }
    })
}
