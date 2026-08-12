import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { appBaseUrl } from '@/lib/meta/config'
import { decodeMetaOAuthState } from '@/lib/meta/oauthState'
import {
  exchangeInstagramCode,
  exchangeInstagramLongLivedToken,
} from '@/lib/meta/instagramAuth'
import { saveInstagramUserConnection } from '@/lib/meta/saveConnection'
import { instagramProvider } from '@/lib/integrations/meta/instagramProvider'

export const runtime = 'nodejs'

function redirectSettings(query: Record<string, string>) {
  const url = new URL('/app/settings', appBaseUrl())
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return NextResponse.redirect(url.toString())
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const err = searchParams.get('error')
  const errDesc = searchParams.get('error_description')
  if (err) {
    return redirectSettings({
      meta: 'error',
      message: errDesc || err || 'Instagram authorization denied',
    })
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) {
    return redirectSettings({ meta: 'error', message: 'Missing Instagram OAuth code or state' })
  }

  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieState = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('meta_ig_oauth_state='))
      ?.slice('meta_ig_oauth_state='.length)
    if (!cookieState || cookieState !== state) {
      return redirectSettings({ meta: 'error', message: 'Invalid OAuth state' })
    }

    const parsed = decodeMetaOAuthState(state)
    if (!parsed || parsed.platform !== 'Instagram') {
      return redirectSettings({ meta: 'error', message: 'Invalid OAuth state payload' })
    }

    const short = await exchangeInstagramCode(code)
    const longLived = await exchangeInstagramLongLivedToken(short.accessToken)
    const account = await instagramProvider.getAccount(longLived.accessToken)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.id !== parsed.userId) {
      return redirectSettings({ meta: 'error', message: 'Session mismatch after Instagram OAuth' })
    }

    const expiresAt =
      longLived.expiresIn != null
        ? new Date(Date.now() + longLived.expiresIn * 1000).toISOString()
        : null

    await saveInstagramUserConnection(supabase, parsed.organizationId, {
      igUserId: account.providerAccountId,
      username: account.username ?? null,
      accessToken: longLived.accessToken,
      expiresAt,
      metaUserId: short.userId,
    })

    const res = redirectSettings({
      meta: 'connected',
      platforms: 'Instagram',
      page: account.username ? `@${account.username}` : 'Instagram',
    })
    res.cookies.set('meta_ig_oauth_state', '', { httpOnly: true, path: '/', maxAge: 0 })
    return res
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Instagram OAuth failed'
    console.error(JSON.stringify({ event: 'meta.oauth.failed', provider: 'instagram', message }))
    return redirectSettings({ meta: 'error', message })
  }
}
