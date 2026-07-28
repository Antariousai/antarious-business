import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

/**
 * Email confirmation via token_hash (works across devices — no PKCE cookie required).
 * Templates: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextRaw = searchParams.get('next')
  const next = nextRaw?.startsWith('/') ? nextRaw : null

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/?error=auth_confirm`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(`${origin}/?error=auth_confirm`)
  }

  let destination = `${origin}/?verified=1`
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        pendingCookies.length = 0
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options: options as Record<string, unknown> })
        })
      },
    },
  })

  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })
  if (error) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(error.message || 'auth_confirm')}`,
    )
  }

  const email = data.user?.email?.trim() || ''

  if (type === 'signup' || type === 'email') {
    await supabase.auth.signOut()
    const qs = new URLSearchParams({ verified: '1' })
    if (email) qs.set('email', email)
    destination = `${origin}/?${qs.toString()}`
  } else if (type === 'recovery') {
    // Keep recovery session so the user can set a new password.
    destination = `${origin}${next || '/auth/reset-password'}`
  } else if (next) {
    destination = `${origin}${next}`
  } else {
    let dest = '/onboarding'
    const userId = data.user?.id
    if (userId) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (membership?.organization_id) {
        const { data: bp } = await supabase
          .from('business_profiles')
          .select('onboarded')
          .eq('organization_id', membership.organization_id)
          .maybeSingle()
        dest = bp?.onboarded ? '/app' : '/onboarding'
      }
    }
    destination = `${origin}${dest}`
  }

  const response = NextResponse.redirect(destination)
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  return response
}
