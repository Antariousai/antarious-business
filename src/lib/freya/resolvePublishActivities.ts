import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Mark waiting publish_post Freya Activity items done when the post
 * was published outside Approve (e.g. Content → Publish Now).
 */
export async function resolveWaitingPublishPostActivities(
  supabase: SupabaseClient,
  organizationId: string,
  postId: string,
): Promise<void> {
  const { error } = await supabase
    .from('freya_activity_items')
    .update({
      status: 'done',
      resolved_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('status', 'waiting')
    .eq('kind', 'publish_post')
    .contains('payload', { post_id: postId })

  if (error) {
    console.warn(
      JSON.stringify({
        event: 'freya.resolve_publish_activities.failed',
        organizationId,
        postId,
        message: error.message,
      }),
    )
  }
}

/**
 * Clear stuck “Review post draft” items whose posts are already published.
 */
export async function resolveStalePublishPostActivities(
  supabase: SupabaseClient,
  organizationId: string,
  items: Array<{ id: string; kind: string; status: string; payload?: unknown }>,
): Promise<string[]> {
  const waiting = items.filter(
    (i) => i.status === 'waiting' && i.kind === 'publish_post',
  )
  const postIds = [
    ...new Set(
      waiting
        .map((i) => {
          const p = i.payload as { post_id?: string } | null
          return typeof p?.post_id === 'string' ? p.post_id : null
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  if (!postIds.length) return []

  const { data: posts, error } = await supabase
    .from('content_posts')
    .select('id, status')
    .eq('organization_id', organizationId)
    .in('id', postIds)
    .eq('status', 'published')
  if (error || !posts?.length) return []

  const published = new Set(posts.map((p) => p.id))
  const ids = waiting
    .filter((i) => {
      const p = i.payload as { post_id?: string } | null
      return p?.post_id && published.has(p.post_id)
    })
    .map((i) => i.id)
  if (!ids.length) return []

  await supabase
    .from('freya_activity_items')
    .update({
      status: 'done',
      resolved_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .in('id', ids)

  return ids
}
