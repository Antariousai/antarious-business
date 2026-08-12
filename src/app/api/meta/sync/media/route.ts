import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { resolveStoredAccessToken } from '@/lib/integrations/crypto/tokenEncryption'
import { instagramProvider } from '@/lib/integrations/meta/instagramProvider'
import { metaGraphGet } from '@/lib/integrations/meta/client'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json().catch(() => ({}))
    const maxPages = Math.min(Number(body.maxPages ?? 3), 10)

    const { data: conn, error: cErr } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .eq('platform', 'Instagram')
      .eq('status', 'connected')
      .maybeSingle()
    if (cErr) throw cErr
    if (!conn) return Response.json({ error: 'Instagram is not connected' }, { status: 400 })

    const token = resolveStoredAccessToken(conn)
    if (!token) return Response.json({ error: 'Instagram connection expired. Reconnect Instagram.' }, { status: 401 })

    let after: string | undefined
    let upserted = 0
    const host = conn.token_kind === 'instagram_user' ? 'instagram' : 'facebook'
    const mediaPath =
      conn.token_kind === 'instagram_user'
        ? '/me/media'
        : `/${conn.external_ig_user_id}/media`

    for (let page = 0; page < maxPages; page++) {
      let items
      let nextCursor: string | null | undefined
      if (conn.token_kind === 'instagram_user') {
        const res = await instagramProvider.listMedia!(token, { limit: 25, after })
        items = res.items
        nextCursor = res.nextCursor
      } else {
        if (!conn.external_ig_user_id) {
          return Response.json({ error: 'No Instagram Business account linked to this Page' }, { status: 400 })
        }
        const json = await metaGraphGet<{
          data?: Array<{
            id: string
            caption?: string
            media_type?: string
            media_url?: string
            permalink?: string
            timestamp?: string
            comments_count?: number
            thumbnail_url?: string
          }>
          paging?: { cursors?: { after?: string } }
        }>(
          mediaPath,
          token,
          {
            fields: 'id,caption,media_type,media_url,permalink,timestamp,comments_count,thumbnail_url',
            limit: 25,
            after,
          },
          { host: 'facebook' },
        )
        items = (json.data ?? []).map((m) => ({
          providerPostId: m.id,
          caption: m.caption ?? null,
          mediaType: m.media_type ?? null,
          mediaUrl: m.media_url ?? null,
          permalink: m.permalink ?? null,
          publishedAt: m.timestamp ?? null,
          commentsCount: m.comments_count ?? 0,
          thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
        }))
        nextCursor = json.paging?.cursors?.after ?? null
      }

      for (const item of items) {
        const { error } = await supabase.from('social_posts').upsert(
          {
            organization_id: ctx.organizationId,
            connection_id: conn.id,
            provider: 'instagram',
            provider_post_id: item.providerPostId,
            caption: item.caption,
            media_type: item.mediaType,
            media_url: item.mediaUrl,
            permalink: item.permalink,
            published_at: item.publishedAt,
            comments_count: item.commentsCount ?? 0,
            thumbnail_url: item.thumbnailUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,provider,provider_post_id' },
        )
        if (error) throw error
        upserted += 1
      }

      if (!nextCursor) break
      after = nextCursor
      void host
    }

    await supabase
      .from('channel_connections')
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq('id', conn.id)

    console.info(
      JSON.stringify({
        event: 'meta.media.synced',
        organizationId: ctx.organizationId,
        count: upserted,
      }),
    )

    return Response.json({ ok: true, upserted })
  } catch (err) {
    return jsonError(err)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .eq('provider', 'instagram')
      .order('published_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return Response.json({ posts: data ?? [] })
  } catch (err) {
    return jsonError(err)
  }
}
