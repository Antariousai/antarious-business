import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext } from '@/lib/org/context'
import { appBaseUrl } from '@/lib/meta/config'
import {
  decodeMetaOAuthState,
  encodePendingMetaPages,
} from '@/lib/meta/oauthState'
import {
  exchangeCodeForUserToken,
  fetchManagedPages,
  fetchMetaUserId,
} from '@/lib/meta/graph'
import { saveMetaPageConnection } from '@/lib/meta/saveConnection'

export const runtime = 'nodejs'

function settingsRedirect(query: Record<string, string>) {
  const url = new URL('/app/settings', appBaseUrl())
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return url.toString()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const clearCookies = (res: NextResponse) => {
    res.cookies.set('meta_oauth_state', '', { path: '/', maxAge: 0 })
    res.cookies.set('meta_oauth_pages', '', { path: '/', maxAge: 0 })
    return res
  }

  if (error) {
    return clearCookies(
      NextResponse.redirect(
        settingsRedirect({
          meta: 'error',
          message: errorDescription || error || 'Meta authorization was cancelled',
        }),
      ),
    )
  }

  if (!code || !stateParam) {
    return clearCookies(
      NextResponse.redirect(
        settingsRedirect({ meta: 'error', message: 'Missing Meta OAuth code' }),
      ),
    )
  }

  const cookieState = request.cookies.get('meta_oauth_state')?.value
  if (!cookieState || cookieState !== stateParam) {
    return clearCookies(
      NextResponse.redirect(
        settingsRedirect({ meta: 'error', message: 'Invalid or expired Meta OAuth state' }),
      ),
    )
  }

  const state = decodeMetaOAuthState(stateParam)
  if (!state) {
    return clearCookies(
      NextResponse.redirect(
        settingsRedirect({ meta: 'error', message: 'Meta OAuth state expired — try Connect again' }),
      ),
    )
  }

  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    if (ctx.organizationId !== state.organizationId || ctx.user.id !== state.userId) {
      return clearCookies(
        NextResponse.redirect(
          settingsRedirect({ meta: 'error', message: 'Signed-in account does not match OAuth start' }),
        ),
      )
    }

    const { accessToken } = await exchangeCodeForUserToken(code)
    const metaUserId = await fetchMetaUserId(accessToken)
    const pages = await fetchManagedPages(accessToken)

    if (!pages.length) {
      return clearCookies(
        NextResponse.redirect(
          settingsRedirect({
            meta: 'error',
            message:
              'No Facebook Pages found. Make sure you admin a Page, then try again.',
          }),
        ),
      )
    }

    if (pages.length === 1) {
      const saved = await saveMetaPageConnection(supabase, ctx.organizationId, pages[0], {
        metaUserId,
        requestedPlatform: state.platform,
      })
      return clearCookies(
        NextResponse.redirect(
          settingsRedirect({
            meta: 'connected',
            page: saved.pageName,
            platforms: saved.platforms.join(','),
          }),
        ),
      )
    }

    // Multiple pages — let the owner pick in Settings
    const pending = encodePendingMetaPages(pages, state)
    const res = NextResponse.redirect(settingsRedirect({ meta: 'pick' }))
    res.cookies.set('meta_oauth_state', '', { path: '/', maxAge: 0 })
    res.cookies.set('meta_oauth_pages', pending, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    })
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meta connect failed'
    return clearCookies(
      NextResponse.redirect(settingsRedirect({ meta: 'error', message })),
    )
  }
}
