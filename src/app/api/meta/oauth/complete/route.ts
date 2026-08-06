import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { decodePendingMetaPages } from '@/lib/meta/oauthState'
import { saveMetaPageConnection } from '@/lib/meta/saveConnection'

export const runtime = 'nodejs'

/** Complete multi-page picker: body { pageId: string } */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = (await request.json().catch(() => ({}))) as { pageId?: string }
    const pageId = body.pageId?.trim()
    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
    }

    const raw = request.cookies.get('meta_oauth_pages')?.value
    const pending = decodePendingMetaPages(raw)
    if (!pending) {
      return NextResponse.json(
        { error: 'Page selection expired. Click Connect and authorize Meta again.' },
        { status: 400 },
      )
    }
    if (
      pending.organizationId !== ctx.organizationId ||
      pending.userId !== ctx.user.id
    ) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 })
    }

    const page = pending.pages.find((p) => p.id === pageId)
    if (!page) {
      return NextResponse.json({ error: 'That Page is not in your pending list' }, { status: 400 })
    }

    const saved = await saveMetaPageConnection(supabase, ctx.organizationId, page, {
      requestedPlatform: pending.platform,
    })

    const res = NextResponse.json({ ok: true, ...saved })
    res.cookies.set('meta_oauth_pages', '', { path: '/', maxAge: 0 })
    return res
  } catch (err) {
    return jsonError(err)
  }
}
