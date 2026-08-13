import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type AssetRow = { storage_path: string; mime_type?: string | null }

async function signAssetUrls(
  supabase: SupabaseClient,
  posts: Array<Record<string, unknown> & { content_assets?: AssetRow[] | null }>,
) {
  return Promise.all(
    posts.map(async (post) => {
      const assets = post.content_assets ?? []
      const signedAssets = await Promise.all(
        assets.map(async (asset) => {
          const { data } = await supabase.storage
            .from('post-media')
            .createSignedUrl(asset.storage_path, 60 * 60 * 24 * 30)
          return {
            storage_path: asset.storage_path,
            mime_type: asset.mime_type ?? null,
            url: data?.signedUrl ?? '',
          }
        }),
      )
      return {
        ...post,
        content_assets: signedAssets,
        image_url: signedAssets.find((a) => a.url)?.url ?? '',
      }
    }),
  )
}

async function attachAssets(
  supabase: SupabaseClient,
  organizationId: string,
  postId: string,
  assets: Array<{ path: string; mimeType?: string }>,
) {
  await supabase.from('content_assets').delete().eq('post_id', postId)
  if (!assets.length) return
  await supabase.from('content_assets').insert(
    assets.map((a) => ({
      organization_id: organizationId,
      post_id: postId,
      storage_path: a.path,
      mime_type: a.mimeType ?? null,
    })),
  )
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'posts')

    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    let query = supabase
      .from('content_posts')
      .select(
        '*, content_post_platforms(platform), content_assets(storage_path, mime_type), content_metric_snapshots(likes, comments, shares, reach, captured_at)',
      )
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    const posts = await signAssetUrls(supabase, data ?? [])
    return Response.json({ posts })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'posts')

    const body = await req.json()
    const caption = String(body.caption ?? '')
    const platforms: string[] = Array.isArray(body.platforms) ? body.platforms.map(String) : []
    const assets: Array<{ path: string; mimeType?: string }> = Array.isArray(body.assets)
      ? body.assets
          .filter((a: { path?: string }) => a && typeof a.path === 'string')
          .map((a: { path: string; mimeType?: string }) => ({
            path: String(a.path),
            mimeType: a.mimeType ? String(a.mimeType) : undefined,
          }))
      : []

    const { data: connections } = await supabase
      .from('channel_connections')
      .select('platform')
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'connected')
    const connected = new Set((connections ?? []).map((c) => String(c.platform).toLowerCase()))
    const hasConnected = connected.size > 0
    const publishablePlatforms = platforms.filter((p) => connected.has(p.toLowerCase()))

    let status = String(body.status || 'draft')
    let scheduledAt = body.scheduled_at ?? null
    if (!hasConnected || publishablePlatforms.length === 0) {
      // Keep scheduled_at on drafts as a calendar plan date (not live publish).
      status = 'draft'
    } else if (scheduledAt && status !== 'draft') {
      status = 'scheduled'
    } else if (status !== 'published' && status !== 'scheduled' && status !== 'draft') {
      status = 'draft'
    }

    const { data: post, error } = await supabase
      .from('content_posts')
      .insert({
        organization_id: ctx.organizationId,
        title: body.title ?? null,
        caption,
        tag: body.tag ?? null,
        status,
        scheduled_at: scheduledAt,
        published_at: status === 'published' ? new Date().toISOString() : null,
        created_by: ctx.user.id,
      })
      .select('*')
      .single()

    if (error) throw error

    const platformsToStore = status === 'draft' ? platforms : publishablePlatforms
    if (platformsToStore.length && post) {
      await supabase.from('content_post_platforms').insert(
        platformsToStore.map((platform) => ({ post_id: post.id, platform })),
      )
    }

    if (post && assets.length) {
      await attachAssets(supabase, ctx.organizationId, post.id, assets)
    }

    const [enriched] = await signAssetUrls(supabase, [
      {
        ...post,
        content_post_platforms: platformsToStore.map((platform) => ({ platform })),
        content_assets: assets.map((a) => ({
          storage_path: a.path,
          mime_type: a.mimeType ?? null,
        })),
      },
    ])

    return Response.json({ post: enriched }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'posts')

    const body = await req.json()
    const id = String(body.id ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { data: connections } = await supabase
      .from('channel_connections')
      .select('platform')
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'connected')
    const connected = new Set((connections ?? []).map((c) => String(c.platform).toLowerCase()))
    const hasConnected = connected.size > 0

    const platforms: string[] | undefined = Array.isArray(body.platforms)
      ? body.platforms.map(String)
      : undefined
    const publishablePlatforms = platforms?.filter((p) => connected.has(p.toLowerCase()))
    const assets: Array<{ path: string; mimeType?: string }> | undefined = Array.isArray(body.assets)
      ? body.assets
          .filter((a: { path?: string }) => a && typeof a.path === 'string')
          .map((a: { path: string; mimeType?: string }) => ({
            path: String(a.path),
            mimeType: a.mimeType ? String(a.mimeType) : undefined,
          }))
      : undefined

    const patch: Record<string, unknown> = {}
    for (const key of ['title', 'caption', 'tag', 'status', 'scheduled_at', 'published_at']) {
      if (key in body) patch[key] = body[key]
    }

    const wantsLiveStatus = patch.status === 'published' || patch.status === 'scheduled'

    if (
      wantsLiveStatus &&
      (!hasConnected || (publishablePlatforms && publishablePlatforms.length === 0))
    ) {
      // Demote to draft but keep scheduled_at so Content calendar plans stay intact.
      patch.status = 'draft'
      delete patch.published_at
    } else if (patch.status === 'published' && !patch.published_at) {
      patch.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('content_posts')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*')
      .single()

    if (error) throw error

    if (platforms) {
      await supabase.from('content_post_platforms').delete().eq('post_id', id)
      const toStore =
        data?.status === 'draft' ? platforms : (publishablePlatforms ?? platforms)
      if (toStore.length) {
        await supabase.from('content_post_platforms').insert(
          toStore.map((platform: string) => ({ post_id: id, platform })),
        )
      }
    }

    if (assets) {
      await attachAssets(supabase, ctx.organizationId, id, assets)
    }

    const { data: full } = await supabase
      .from('content_posts')
      .select('*, content_post_platforms(platform), content_assets(storage_path, mime_type)')
      .eq('id', id)
      .single()

    const [enriched] = await signAssetUrls(supabase, full ? [full] : [{ ...data, content_assets: [] }])

    return Response.json({ post: enriched })
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'posts')

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase
      .from('content_posts')
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)

    if (error) throw error
    return Response.json({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
