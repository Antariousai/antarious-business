import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import {
  metaConfigured,
  preferInstagramBusinessLogin,
  instagramOAuthRedirectUri,
} from '@/lib/meta/config'
import { encodeMetaOAuthState } from '@/lib/meta/oauthState'
import { buildInstagramAuthorizeUrl } from '@/lib/meta/instagramAuth'
import { assertChannelSlot } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET() {
  try {
    if (!metaConfigured() || !preferInstagramBusinessLogin()) {
      return NextResponse.json(
        {
          error:
            'Instagram Business Login is not configured. Set META_APP_ID / META_APP_SECRET (and ensure META_IG_LOGIN_ENABLED is not false).',
          code: 'META_CONFIG',
        },
        { status: 503 },
      )
    }

    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)

    const { data: existing } = await supabase
      .from('channel_connections')
      .select('status')
      .eq('organization_id', ctx.organizationId)
      .eq('platform', 'Instagram')
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
      platform: 'Instagram',
    })

    console.info(
      JSON.stringify({
        event: 'meta.oauth.started',
        provider: 'instagram',
        organizationId: ctx.organizationId,
        redirectUri: instagramOAuthRedirectUri(),
      }),
    )

    const authorizeUrl = buildInstagramAuthorizeUrl(state)
    const res = NextResponse.redirect(authorizeUrl)
    res.cookies.set('meta_ig_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })
    return res
  } catch (err) {
    return jsonError(err)
  }
}
