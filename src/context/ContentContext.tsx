import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CONTENT_POSTS as SEED, type ContentPost, type Platform } from '../data/mockData'
import { apiFetch } from '@/lib/backend/api'
import { mapApiPost } from '@/lib/backend/mappers'
import { useBackendMode } from '@/lib/backend/BackendModeContext'
import { hasSupabaseEnv } from '@/lib/backend/mode'

const STORAGE_KEY = 'antarious-content-posts-v2-bd'

function normalizePost(post: ContentPost): ContentPost {
  return {
    ...post,
    platforms: post.platforms?.length ? post.platforms : [post.platform],
    tag: post.tag ?? 'Food',
  }
}

function loadPosts(): ContentPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SEED.map(normalizePost)
    const parsed = JSON.parse(raw) as ContentPost[]
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizePost) : SEED.map(normalizePost)
  } catch {
    return SEED.map(normalizePost)
  }
}

function savePosts(posts: ContentPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export type SavePostInput = {
  platforms: Platform[]
  caption: string
  tag: string
  image: string
  status: ContentPost['status']
  scheduledAt?: string
  author?: string
  /** Uploaded storage assets (backend mode) */
  assets?: { path: string; mimeType?: string; url?: string }[]
}

export type PublishMeta = {
  permalink: string | null
  providerPostId?: string
}

export type SavePostResult = {
  post: ContentPost
  publishMeta?: PublishMeta
}

interface ContentContextValue {
  posts: ContentPost[]
  loading: boolean
  createPost: (input: SavePostInput) => Promise<SavePostResult>
  updatePost: (
    id: string,
    input: Partial<SavePostInput>,
    options?: { republish?: boolean },
  ) => Promise<SavePostResult | undefined>
  resetPosts: () => void
  refresh: () => Promise<void>
}

const ContentContext = createContext<ContentContextValue | null>(null)

function formatPostDate(status: ContentPost['status'], scheduledAt?: string): string {
  if (status === 'draft') return 'Draft'
  if (status === 'scheduled' && scheduledAt) {
    const d = new Date(scheduledAt)
    return d.toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return new Date().toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const { backend, ready } = useBackendMode()
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!backend) return
    const data = await apiFetch<{ posts: Parameters<typeof mapApiPost>[0][] }>('/api/posts')
    setPosts((data.posts ?? []).map(mapApiPost))
  }, [backend])

  useEffect(() => {
    if (!ready) return
    if (!backend) {
      // Supabase configured but no session — don't revive demo seed posts.
      if (hasSupabaseEnv()) {
        setPosts([])
        setLoading(false)
        return
      }
      setPosts(loadPosts())
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void refresh()
      .catch(() => {
        if (!cancelled) setPosts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [backend, ready, refresh])

  const persistLocal = useCallback((next: ContentPost[]) => {
    setPosts(next)
    savePosts(next)
  }, [])

  const createPost = useCallback(
    async (input: SavePostInput): Promise<SavePostResult> => {
      if (backend) {
        const platforms =
          input.platforms?.length > 0 ? input.platforms : (['Facebook', 'Instagram'] as Platform[])
        const data = await apiFetch<{
          post: Parameters<typeof mapApiPost>[0]
          meta?: { permalink?: string | null; providerPostId?: string }
        }>('/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            caption: input.caption,
            tag: input.tag || 'Promo',
            status: input.status || 'draft',
            scheduled_at: input.scheduledAt ?? null,
            platforms,
            assets: (input.assets ?? [])
              .filter((a) => a.path)
              .map((a) => ({ path: a.path, mimeType: a.mimeType })),
          }),
        })
        if (!data?.post?.id) {
          throw new Error('Post was not saved. Please try again.')
        }
        // Prefer server row (includes status + platforms) then refresh list.
        await refresh()
        const mapped = mapApiPost({
          ...data.post,
          content_post_platforms:
            data.post.content_post_platforms ??
            platforms.map((platform) => ({ platform })),
          image_url: data.post.image_url || input.assets?.[0]?.url || input.image || '',
        })
        setPosts((prev) => {
          if (prev.some((p) => p.id === mapped.id)) return prev
          return [mapped, ...prev]
        })
        return {
          post: mapped,
          publishMeta:
            data.meta?.permalink || data.meta?.providerPostId
              ? {
                  permalink: data.meta.permalink ?? null,
                  providerPostId: data.meta.providerPostId,
                }
              : undefined,
        }
      }

      const post: ContentPost = {
        id: `p-${Date.now()}`,
        platform: input.platforms[0] ?? 'Instagram',
        platforms: input.platforms.length ? input.platforms : ['Instagram'],
        author: input.author ?? 'You',
        status: input.status,
        caption: input.caption,
        image: input.image,
        tag: input.tag,
        scheduledAt: input.scheduledAt,
        date: formatPostDate(input.status, input.scheduledAt),
        likes: 0,
        views: 0,
        comments: 0,
        shares: 0,
      }
      persistLocal([post, ...posts])
      return { post }
    },
    [backend, persistLocal, posts, refresh],
  )

  const updatePost = useCallback(
    async (
      id: string,
      input: Partial<SavePostInput>,
      options?: { republish?: boolean },
    ): Promise<SavePostResult | undefined> => {
      if (backend) {
        const data = await apiFetch<{
          post: Parameters<typeof mapApiPost>[0]
          meta?: { permalink?: string | null; providerPostId?: string }
        }>('/api/posts', {
          method: 'PATCH',
          body: JSON.stringify({
            id,
            caption: input.caption,
            tag: input.tag,
            status: input.status,
            scheduled_at: input.scheduledAt,
            platforms: input.platforms,
            ...(input.assets
              ? {
                  assets: input.assets
                    .filter((a) => a.path)
                    .map((a) => ({ path: a.path, mimeType: a.mimeType })),
                }
              : {}),
          }),
        })
        if (!data?.post?.id) {
          throw new Error('Post was not updated. Please try again.')
        }
        await refresh()
        const mapped = mapApiPost({
          ...data.post,
          content_post_platforms:
            data.post.content_post_platforms ??
            input.platforms?.map((platform) => ({ platform })) ??
            null,
          image_url: data.post.image_url || input.assets?.[0]?.url || input.image || data.post.image_url,
        })
        if (!mapped.image && (input.assets?.[0]?.url || input.image)) {
          mapped.image = input.assets?.[0]?.url || input.image || ''
        }
        setPosts((prev) => {
          const next = prev.map((p) => (p.id === id ? mapped : p))
          if (!next.some((p) => p.id === id)) return [mapped, ...next]
          return next
        })
        return {
          post: mapped,
          publishMeta:
            data.meta?.permalink || data.meta?.providerPostId
              ? {
                  permalink: data.meta.permalink ?? null,
                  providerPostId: data.meta.providerPostId,
                }
              : undefined,
        }
      }

      let updated: ContentPost | undefined
      const next = posts.map((p) => {
        if (p.id !== id) return p
        const status = input.status ?? p.status
        const scheduledAt = input.scheduledAt ?? p.scheduledAt
        const republish = options?.republish ?? false
        updated = normalizePost({
          ...p,
          ...input,
          platform: input.platforms?.[0] ?? p.platform,
          platforms: input.platforms ?? p.platforms,
          date: republish ? formatPostDate(status, scheduledAt) : p.date,
        })
        return updated
      })
      if (!updated) return undefined
      persistLocal(next)
      return { post: updated }
    },
    [backend, persistLocal, posts, refresh],
  )

  const resetPosts = useCallback(() => {
    if (backend) {
      void refresh()
      return
    }
    persistLocal(SEED.map(normalizePost))
  }, [backend, persistLocal, refresh])

  const value = useMemo(
    () => ({ posts, loading, createPost, updatePost, resetPosts, refresh }),
    [posts, loading, createPost, updatePost, resetPosts, refresh],
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const ctx = useContext(ContentContext)
  if (!ctx) throw new Error('useContent must be used within ContentProvider')
  return ctx
}

export function postPlatforms(post: ContentPost): Platform[] {
  return post.platforms?.length ? post.platforms : [post.platform]
}
