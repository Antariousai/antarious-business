import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import {
  isMetaOAuthPlatform,
  metaConfigured,
  metaOAuthRedirectUri,
} from '@/lib/meta/config'
import { encodeMetaOAuthState } from '@/lib/meta/oauthState'
import { buildMetaAuthorizeUrl } from '@/lib/meta/graph'
import { assertChannelSlot } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    if (!metaConfigured()) {
      return NextResponse.json(
        {
          error:
            'Meta OAuth is not configured. Set META_APP_ID and META_APP_SECRET on the server.',
          code: 'META_CONFIG',
        },
        { status: 503 },
      )
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') || 'Facebook'
    if (!isMetaOAuthPlatform(platform)) {
      return NextResponse.json(
        { error: 'Connect with Meta supports Facebook, Instagram, or Messenger.' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    // Soft check: reconnecting an existing Meta channel should still be allowed.
    const { data: existing } = await supabase
      .from('channel_connections')
      .select('status')
      .eq('organization_id', ctx.organizationId)
      .eq('platform', platform)
      .maybeSingle()

    if (existing?.status !== 'connected') {
      try {
        await assertChannelSlot(supabase, ctx.organizationId)
      } catch (err) {
        return jsonError(err)
      }
    }

    const state = encodeMetaOAuthState({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      platform,
    })

    const authorizeUrl = buildMetaAuthorizeUrl(state)
    const res = NextResponse.redirect(authorizeUrl)
    res.cookies.set('meta_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })
    // Debug aid — never include secrets
    res.headers.set('x-meta-redirect-uri', metaOAuthRedirectUri())
    return res
  } catch (err) {
    return jsonError(err)
  }
}
