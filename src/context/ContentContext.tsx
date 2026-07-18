import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CONTENT_POSTS as SEED, type ContentPost, type Platform } from '../data/mockData'

const STORAGE_KEY = 'antarious-content-posts-v1'

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
}

interface ContentContextValue {
  posts: ContentPost[]
  createPost: (input: SavePostInput) => ContentPost
  updatePost: (
    id: string,
    input: Partial<SavePostInput>,
    options?: { republish?: boolean },
  ) => ContentPost | undefined
  resetPosts: () => void
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
  const [posts, setPosts] = useState<ContentPost[]>(loadPosts)

  const persist = useCallback((next: ContentPost[]) => {
    setPosts(next)
    savePosts(next)
  }, [])

  const createPost = useCallback(
    (input: SavePostInput): ContentPost => {
      const post: ContentPost = {
        id: `p-${Date.now()}`,
        platform: input.platforms[0] ?? 'Instagram',
        platforms: input.platforms,
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
      persist([post, ...posts])
      return post
    },
    [persist, posts],
  )

  const updatePost = useCallback(
    (id: string, input: Partial<SavePostInput>, options?: { republish?: boolean }): ContentPost | undefined => {
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
      persist(next)
      return updated
    },
    [persist, posts],
  )

  const resetPosts = useCallback(() => {
    persist(SEED.map(normalizePost))
  }, [persist])

  const value = useMemo(
    () => ({ posts, createPost, updatePost, resetPosts }),
    [posts, createPost, updatePost, resetPosts],
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
