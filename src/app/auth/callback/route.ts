import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

/**
 * Handles Supabase Auth PKCE redirects (`?code=`).
 * Prefer `/auth/confirm?token_hash=…` for signup emails (works across devices).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const intent = searchParams.get('intent')
  const nextRaw = searchParams.get('next') || '/onboarding'
  const next = nextRaw.startsWith('/') ? nextRaw : '/onboarding'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`)
  }

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message || 'auth_callback')}`,
    )
  }

  const email = data.user?.email?.trim() || ''
  let destination = `${origin}${next}`

  const goVerifiedLogin = async () => {
    await supabase.auth.signOut()
    const qs = new URLSearchParams({ verified: '1' })
    if (email) qs.set('email', email)
    destination = `${origin}/login?${qs.toString()}`
  }

  if (intent === 'confirm' || intent === 'verified') {
    await goVerifiedLogin()
  } else if (data.user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', data.user.id)
      .limit(1)
      .maybeSingle()

    if (membership?.organization_id) {
      const { data: bp } = await supabase
        .from('business_profiles')
        .select('onboarded')
        .eq('organization_id', membership.organization_id)
        .maybeSingle()
      destination = `${origin}${bp?.onboarded ? '/app' : '/onboarding'}`
    } else {
      await goVerifiedLogin()
    }
  }

  const response = NextResponse.redirect(destination)
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  return response
}
