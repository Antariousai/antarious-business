import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { decodePendingMetaPages } from '@/lib/meta/oauthState'

export const runtime = 'nodejs'

/** Safe list of pending Pages for the picker (no access tokens). */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const raw = request.cookies.get('meta_oauth_pages')?.value
    const pending = decodePendingMetaPages(raw)
    if (!pending) {
      return NextResponse.json({ pages: [] })
    }
    if (
      pending.organizationId !== ctx.organizationId ||
      pending.userId !== ctx.user.id
    ) {
      return NextResponse.json({ pages: [] })
    }
    return NextResponse.json({
      pages: pending.pages.map((p) => ({
        id: p.id,
        name: p.name,
        pageUrl: p.pageUrl,
        igUsername: p.igUsername,
        hasInstagram: Boolean(p.igUserId),
      })),
    })
  } catch (err) {
    return jsonError(err)
  }
}
