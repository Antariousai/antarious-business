import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Handles Supabase Auth email links (confirm signup, magic link, recovery, etc.).
 * Templates should redirect here via emailRedirectTo / Site URL flow.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextRaw = searchParams.get('next') || '/onboarding'
  const next = nextRaw.startsWith('/') ? nextRaw : '/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Prefer app home if already onboarded; otherwise onboarding.
      let dest = next
      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (membership?.organization_id) {
          const { data: bp } = await supabase
            .from('business_profiles')
            .select('onboarded')
            .eq('organization_id', membership.organization_id)
            .maybeSingle()
          if (bp?.onboarded) dest = '/app'
          else dest = '/onboarding'
        }
      }

      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_callback`)
}
