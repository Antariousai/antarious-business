import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { resolveStoredAccessToken } from '@/lib/integrations/crypto/tokenEncryption'
import { instagramProvider } from '@/lib/integrations/meta/instagramProvider'
import { metaGraphGet, metaGraphPost } from '@/lib/integrations/meta/client'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()
    const postId = String(body.socialPostId || body.providerPostId || '')
    if (!postId) return Response.json({ error: 'socialPostId or providerPostId required' }, { status: 400 })

    const { data: conn } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .eq('platform', 'Instagram')
      .eq('status', 'connected')
      .maybeSingle()
    if (!conn) return Response.json({ error: 'Instagram is not connected' }, { status: 400 })
    const token = resolveStoredAccessToken(conn)
    if (!token) return Response.json({ error: 'Instagram connection expired. Reconnect Instagram.' }, { status: 401 })

    let providerPostId = postId
    const { data: local } = await supabase
      .from('social_posts')
      .select('id, provider_post_id')
      .eq('organization_id', ctx.organizationId)
      .or(`id.eq.${postId},provider_post_id.eq.${postId}`)
      .maybeSingle()
    if (local?.provider_post_id) providerPostId = local.provider_post_id

    const comments =
      conn.token_kind === 'instagram_user'
        ? await instagramProvider.listComments!(token, providerPostId)
        : (
            await metaGraphGet<{
              data?: Array<{
                id: string
                text?: string
                timestamp?: string
                username?: string
                from?: { id?: string; username?: string }
                parent_id?: string
              }>
            }>(
              `/${providerPostId}/comments`,
              token,
              { fields: 'id,text,timestamp,username,from,parent_id', limit: 50 },
              { host: 'facebook' },
            )
          ).data?.map((c) => ({
            providerCommentId: c.id,
            text: c.text ?? '',
            authorUsername: c.username || c.from?.username || null,
            authorProviderUserId: c.from?.id || null,
            parentProviderCommentId: c.parent_id || null,
            providerTimestamp: c.timestamp || null,
          })) ?? []

    let socialPostRowId = local?.id
    if (!socialPostRowId) {
      const { data: ensured } = await supabase
        .from('social_posts')
        .upsert(
          {
            organization_id: ctx.organizationId,
            connection_id: conn.id,
            provider: 'instagram',
            provider_post_id: providerPostId,
            comments_count: comments.length,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,provider,provider_post_id' },
        )
        .select('id')
        .single()
      socialPostRowId = ensured?.id
    }

    let upserted = 0
    if (socialPostRowId) {
      for (const c of comments) {
        let contactId: string | null = null
        if (c.authorProviderUserId) {
          const { data: contact } = await supabase
            .from('social_contacts')
            .upsert(
              {
                organization_id: ctx.organizationId,
                provider: 'instagram',
                provider_user_id: c.authorProviderUserId,
                username: c.authorUsername,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'organization_id,provider,provider_user_id' },
            )
            .select('id')
            .single()
          contactId = contact?.id ?? null
        }
        const { error } = await supabase.from('social_comments').upsert(
          {
            organization_id: ctx.organizationId,
            social_post_id: socialPostRowId,
            provider: 'instagram',
            provider_comment_id: c.providerCommentId,
            parent_provider_comment_id: c.parentProviderCommentId,
            social_contact_id: contactId,
            author_username: c.authorUsername,
            text: c.text,
            provider_timestamp: c.providerTimestamp,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,provider,provider_comment_id' },
        )
        if (error) throw error
        upserted += 1
      }
      await supabase
        .from('social_posts')
        .update({ comments_count: comments.length, updated_at: new Date().toISOString() })
        .eq('id', socialPostRowId)
    }

    console.info(
      JSON.stringify({
        event: 'meta.comment.received',
        organizationId: ctx.organizationId,
        providerPostId,
        count: upserted,
      }),
    )

    return Response.json({ ok: true, upserted, comments })
  } catch (err) {
    return jsonError(err)
  }
}

/** Reply to an Instagram comment. */
export async function PUT(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()
    const providerCommentId = String(body.providerCommentId || '')
    const text = String(body.text || '').trim()
    if (!providerCommentId || !text) {
      return Response.json({ error: 'providerCommentId and text required' }, { status: 400 })
    }

    const { data: conn } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .eq('platform', 'Instagram')
      .eq('status', 'connected')
      .maybeSingle()
    if (!conn) return Response.json({ error: 'Instagram is not connected' }, { status: 400 })
    const token = resolveStoredAccessToken(conn)
    if (!token) return Response.json({ error: 'Instagram connection expired. Reconnect Instagram.' }, { status: 401 })

    let replyId: string
    if (conn.token_kind === 'instagram_user') {
      const res = await instagramProvider.replyToComment!(token, providerCommentId, text)
      replyId = res.providerCommentId
    } else {
      const json = await metaGraphPost<{ id?: string }>(
        `/${providerCommentId}/replies`,
        token,
        { message: text },
        { host: 'facebook' },
      )
      if (!json.id) throw new Error('Reply missing id')
      replyId = json.id
    }

    console.info(
      JSON.stringify({
        event: 'meta.comment.sent',
        organizationId: ctx.organizationId,
        parent: providerCommentId,
        replyId,
      }),
    )

    return Response.json({ ok: true, providerCommentId: replyId })
  } catch (err) {
    return jsonError(err)
  }
}
