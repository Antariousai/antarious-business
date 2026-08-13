import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveStoredAccessToken } from '@/lib/integrations/crypto/tokenEncryption'
import { MetaApiError, metaGraphPostForm } from '@/lib/integrations/meta/client'

export type PublishToFacebookResult =
  | {
      ok: true
      providerPostId: string
      permalink: string | null
      pageId: string
      connectionId: string
    }
  | { ok: false; error: string; userMessage: string }

function friendlyPublishError(err: unknown): string {
  if (err instanceof MetaApiError) {
    if (err.code === 190 || /session has expired|oauth/i.test(err.message)) {
      return 'Facebook connection expired. Reconnect the Page in Settings.'
    }
    if (err.code === 10 || /permission|(#200)|pages_manage_posts/i.test(err.message)) {
      return 'Missing Page publish permission. Reconnect Facebook and grant post access.'
    }
    if (err.status === 429 || err.code === 4 || err.code === 17) {
      return 'Meta rate limit hit. Try again in a few minutes.'
    }
    return err.message
  }
  return err instanceof Error ? err.message : 'Failed to publish to Facebook'
}

async function loadFacebookConnection(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data: rows, error } = await supabase
    .from('channel_connections')
    .select(
      'id, platform, status, external_page_id, page_name, access_token, access_token_enc, provider',
    )
    .eq('organization_id', organizationId)
    .eq('status', 'connected')
    .in('platform', ['Facebook', 'Messenger'])
  if (error) throw error

  const preferred =
    (rows ?? []).find((r) => r.platform === 'Facebook' && r.external_page_id) ||
    (rows ?? []).find((r) => r.external_page_id) ||
    null
  return preferred
}

async function publicImageUrl(
  supabase: SupabaseClient,
  postId: string,
): Promise<{ url: string; mimeType: string | null } | null> {
  const { data: assets } = await supabase
    .from('content_assets')
    .select('storage_path, mime_type')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(5)

  const image = (assets ?? []).find(
    (a) => !a.mime_type || String(a.mime_type).startsWith('image/'),
  )
  if (!image?.storage_path) return null

  const { data } = await supabase.storage
    .from('post-media')
    .createSignedUrl(image.storage_path, 60 * 60 * 24)
  if (!data?.signedUrl) return null
  return { url: data.signedUrl, mimeType: image.mime_type ?? null }
}

/**
 * Publish an Antarious content post to the connected Facebook Page.
 * Uses Page token from channel_connections. Does not publish to personal profiles.
 */
export async function publishContentPostToFacebook(
  supabase: SupabaseClient,
  organizationId: string,
  postId: string,
): Promise<PublishToFacebookResult> {
  const { data: post, error: postErr } = await supabase
    .from('content_posts')
    .select('id, caption, title, content_post_platforms(platform)')
    .eq('id', postId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (postErr) throw postErr
  if (!post) {
    return { ok: false, error: 'not_found', userMessage: 'Post not found.' }
  }

  const platforms = (
    (post.content_post_platforms as { platform?: string }[] | null) ?? []
  )
    .map((p) => String(p.platform || ''))
    .filter(Boolean)
  const wantsFacebook =
    platforms.length === 0 ||
    platforms.some((p) => {
      const n = p.toLowerCase()
      return n === 'facebook' || n === 'messenger'
    })
  if (!wantsFacebook) {
    return {
      ok: false,
      error: 'platform',
      userMessage: 'This post is not targeted at Facebook.',
    }
  }

  const conn = await loadFacebookConnection(supabase, organizationId)
  if (!conn?.external_page_id) {
    return {
      ok: false,
      error: 'no_connection',
      userMessage: 'Connect a Facebook Page in Settings before publishing.',
    }
  }

  const token = resolveStoredAccessToken(conn)
  if (!token) {
    return {
      ok: false,
      error: 'token',
      userMessage: 'Facebook connection expired. Reconnect in Settings.',
    }
  }

  const caption = String(post.caption || post.title || '').trim()
  if (!caption) {
    return {
      ok: false,
      error: 'caption',
      userMessage: 'Add a caption before publishing to Facebook.',
    }
  }

  const pageId = String(conn.external_page_id)
  const image = await publicImageUrl(supabase, postId)

  try {
    let providerPostId: string
    let mediaType: string | null = null
    let mediaUrl: string | null = null

    if (image?.url) {
      const photo = await metaGraphPostForm<{ id?: string; post_id?: string }>(
        `/${pageId}/photos`,
        token,
        {
          url: image.url,
          caption,
          published: 'true',
        },
      )
      providerPostId = String(photo.post_id || photo.id || '')
      mediaType = 'IMAGE'
      mediaUrl = image.url
    } else {
      const feed = await metaGraphPostForm<{ id?: string }>(`/${pageId}/feed`, token, {
        message: caption,
      })
      providerPostId = String(feed.id || '')
    }

    if (!providerPostId) {
      return {
        ok: false,
        error: 'no_id',
        userMessage: 'Facebook accepted the post but returned no id. Check the Page.',
      }
    }

    const permalink = `https://www.facebook.com/${providerPostId}`

    await supabase.from('social_posts').upsert(
      {
        organization_id: organizationId,
        connection_id: conn.id,
        provider: 'facebook',
        provider_post_id: providerPostId,
        caption,
        media_type: mediaType,
        media_url: mediaUrl,
        permalink,
        published_at: new Date().toISOString(),
        metadata: { content_post_id: postId, page_id: pageId },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,provider,provider_post_id' },
    )

    await supabase
      .from('channel_connections')
      .update({ last_error: null, last_synced_at: new Date().toISOString() })
      .eq('id', conn.id)

    console.info(
      JSON.stringify({
        event: 'meta.publish.facebook',
        organizationId,
        postId,
        pageId,
        providerPostId,
        hasImage: Boolean(image),
      }),
    )

    return {
      ok: true,
      providerPostId,
      permalink,
      pageId,
      connectionId: conn.id,
    }
  } catch (err) {
    const userMessage = friendlyPublishError(err)
    await supabase
      .from('channel_connections')
      .update({ last_error: userMessage })
      .eq('id', conn.id)
    return {
      ok: false,
      error: err instanceof MetaApiError ? String(err.code ?? 'meta') : 'meta',
      userMessage,
    }
  }
}
