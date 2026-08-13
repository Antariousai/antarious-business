import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bookmark,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Eye,
  GripVertical,
  Heart,
  LayoutGrid,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Pencil,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import type { ContentPost } from '../data/mockData'
import { CreatePostModal } from '../components/CreatePostModal'
import { PageHero } from '../components/PageHero'
import { PlatformIcon } from '../components/PlatformIcon'
import { postPlatforms, useContent } from '../context/ContentContext'
import { useTemplates } from '../context/TemplatesContext'
import { ApiError, apiFetch } from '../lib/backend/api'
import { useBackendMode } from '../lib/backend/BackendModeContext'

type Tab = 'feed' | 'calendar' | 'insights'
type Filter = 'all' | 'draft' | 'scheduled' | 'published'

export function ContentPage() {
  const [tab, setTab] = useState<Tab>('feed')
  const [filter, setFilter] = useState<Filter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
  const [createCaption, setCreateCaption] = useState('')
  const [createPrompt, setCreatePrompt] = useState('')
  const [createLeaveToFreya, setCreateLeaveToFreya] = useState(false)
  const [savedTplId, setSavedTplId] = useState<string | null>(null)
  const [focusPostId, setFocusPostId] = useState<string | null>(null)
  const { posts, refresh } = useContent()
  const { saveFromPost, useTemplate } = useTemplates()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    void refresh().catch(() => {})
  }, [refresh])

  useEffect(() => {
    const state = location.state as {
      freyaTemplate?: { caption: string; id?: string }
      focusPostId?: string
      openCreate?: boolean
      tab?: Tab
      freyaPrompt?: string
      leaveToFreya?: boolean
    } | null
    if (!state) return

    if (state.tab) setTab(state.tab)
    if (state.openCreate) {
      setShowCreate(true)
    }
    if (state.freyaPrompt) {
      setCreatePrompt(state.freyaPrompt)
      setShowCreate(true)
    }
    if (state.leaveToFreya) {
      setCreateLeaveToFreya(true)
      setShowCreate(true)
    }
    if (state.freyaTemplate?.caption) {
      setCreateCaption(state.freyaTemplate.caption)
      setShowCreate(true)
      if (state.freyaTemplate.id) useTemplate(state.freyaTemplate.id)
    }
    if (state.focusPostId) {
      const id = state.focusPostId
      setTab('feed')
      setFilter('draft')
      setFocusPostId(id)
      void refresh()
        .catch(() => {})
        .finally(() => {
          window.setTimeout(() => {
            document.getElementById(`post-${id}`)?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            })
          }, 120)
        })
      window.setTimeout(() => setFocusPostId(null), 3500)
    }
    navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate, useTemplate, refresh])

  const filtered = useMemo(() => {
    if (filter === 'all') return posts
    return posts.filter((p) => p.status === filter)
  }, [filter, posts])

  const counts = {
    all: posts.length,
    draft: posts.filter((p) => p.status === 'draft').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
  }

  const topPosts = [...posts]
    .filter((p) => p.status === 'published')
    .sort((a, b) => b.likes + b.comments + b.views - (a.likes + a.comments + a.views))

  const totals = topPosts.reduce(
    (acc, p) => ({
      likes: acc.likes + p.likes,
      views: acc.views + p.views,
      comments: acc.comments + p.comments,
      shares: acc.shares + (p.shares ?? 0),
    }),
    { likes: 0, views: 0, comments: 0, shares: 0 },
  )

  return (
    <div className="px-8 py-6 pb-24">
      <PageHero
        accent="coral"
        title="Your posts"
        subtitle="Drafts, scheduled posts, and how they did — Freya keeps things moving."
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-rose-600 shadow-sm hover:bg-rose-50"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            New post
          </button>
        }
      />

      <div className="mb-4 inline-flex rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-sky/15">
        {(
          [
            { id: 'feed', label: 'Feed', icon: LayoutGrid },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
            { id: 'insights', label: 'Insights', icon: ChartColumn },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
              tab === t.id
                ? 'bg-gradient-to-r from-sky-bright to-sky text-white shadow-sm shadow-sky/30'
                : 'text-slate-500 hover:text-ink'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <>
          {savedTplId && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700">
              Saved to Templates.{' '}
              <Link to="/app/templates" className="underline">
                View templates →
              </Link>
            </div>
          )}
          <div className="mb-5 flex flex-wrap gap-2">
            {(
              [
                ['all', `All — ${counts.all}`],
                ['draft', `Draft — ${counts.draft}`],
                ['scheduled', `Scheduled — ${counts.scheduled}`],
                ['published', `Published — ${counts.published}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${
                  filter === id
                    ? 'bg-sky text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((post) => (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className={`overflow-hidden rounded-2xl bg-white shadow-sm transition ${
                  focusPostId === post.id
                    ? 'ring-2 ring-sky shadow-md shadow-sky/20'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 px-4 pt-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink">
                    {postPlatforms(post).map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200/80"
                        title={p}
                      >
                        <PlatformIcon platform={p} size={13} />
                        <span className="text-[11px]">{p}</span>
                      </span>
                    ))}
                    <span className="font-normal text-sky"># {post.author}</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                      post.status === 'published'
                        ? 'bg-emerald-50 text-emerald-600'
                        : post.status === 'scheduled'
                          ? 'bg-sky-soft text-sky-bright'
                          : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
                {post.image?.trim() ? (
                  <img src={post.image} alt="" className="mt-3 h-48 w-full object-cover" />
                ) : (
                  <div className="mt-3 flex h-48 items-center justify-center bg-gradient-to-br from-sky-soft to-amber-50 text-[13px] font-semibold text-muted">
                    No media
                  </div>
                )}
                <div className="p-4">
                  <p className="line-clamp-3 text-[13.5px] leading-relaxed text-ink">
                    {post.caption}
                  </p>
                  <p className="mt-2 text-[12px] text-muted">{post.date}</p>
                  {post.status === 'published' && (
                    <div className="mt-3 flex items-center gap-4 text-[12px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" /> {post.likes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {post.views.toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" /> {post.comments}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" /> {post.shares || 0}
                      </span>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPost(post)}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-soft text-[13px] font-semibold text-sky hover:bg-sky/20"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const tpl = await saveFromPost(
                            post.caption,
                            `${post.status === 'published' ? 'Winning' : 'Saved'}: ${post.caption.slice(0, 28)}…`,
                          )
                          setSavedTplId(tpl.id)
                          setTimeout(() => setSavedTplId(null), 4000)
                        })()
                      }}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-50 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Bookmark className="h-4 w-4" />
                      Save template
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-sky/30 bg-white px-6 py-14 text-center shadow-sm">
              <LayoutGrid className="mx-auto h-9 w-9 text-sky/50" />
              <h3 className="mt-3 text-[16px] font-bold text-ink">No activity yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-[13px] text-muted">
                {filter === 'all'
                  ? 'No posts here yet. Draft one with Freya to get started.'
                  : `No ${filter} posts yet.`}
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sky-bright"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                New post
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'calendar' && <ContentCalendar />}

      {tab === 'insights' && (
        <ContentInsights
          topPosts={topPosts}
          totals={totals}
          onDraft={() => {
            setCreatePrompt('Draft a post based on what has been working for my business')
            setShowCreate(true)
          }}
        />
      )}

      {(showCreate || editingPost) && (
        <CreatePostModal
          post={editingPost ?? undefined}
          onClose={() => {
            setShowCreate(false)
            setEditingPost(null)
            setCreateCaption('')
            setCreatePrompt('')
            setCreateLeaveToFreya(false)
            setTab('feed')
            setFilter('draft')
            void refresh().catch(() => {})
          }}
          initialCaption={createCaption}
          initialPrompt={createPrompt}
          initialLeaveToFreya={createLeaveToFreya}
        />
      )}
    </div>
  )
}

function ContentInsights({
  topPosts,
  totals,
  onDraft,
}: {
  topPosts: ContentPost[]
  totals: { likes: number; views: number; comments: number; shares: number }
  onDraft: () => void
}) {
  const hasMetrics = totals.likes + totals.views + totals.comments + totals.shares > 0
  const podium = topPosts.filter((p) => p.likes + p.views + p.comments > 0).slice(0, 3)
  const [first, second, third] = [podium[0], podium[1], podium[2]]
  const engagementTotal = totals.likes + totals.comments + totals.shares
  const mix = [
    { key: 'Likes', value: totals.likes, color: '#fb7185' },
    { key: 'Comments', value: totals.comments, color: '#fbbf24' },
    { key: 'Shares', value: totals.shares, color: '#38bdf8' },
  ]
    .filter((m) => m.value > 0)
    .map((m) => ({
      ...m,
      pct: engagementTotal > 0 ? Math.round((m.value / engagementTotal) * 100) : 0,
    }))

  const pulse = [
    { label: 'Likes', value: totals.likes, icon: Heart, soft: 'bg-rose-50 text-rose-600', tone: 'from-rose-500 to-orange-400' },
    { label: 'Reach', value: totals.views, icon: Eye, soft: 'bg-sky-soft text-sky', tone: 'from-sky to-cyan-400' },
    { label: 'Comments', value: totals.comments, icon: MessageCircle, soft: 'bg-amber-50 text-amber-700', tone: 'from-amber-400 to-orange-300' },
    { label: 'Shares', value: totals.shares, icon: MousePointerClick, soft: 'bg-sky-soft text-sky-bright', tone: 'from-sky-bright to-coral' },
  ]

  if (!topPosts.length || !hasMetrics) {
    return (
      <div className="rounded-2xl border border-dashed border-sky/30 bg-white px-6 py-16 text-center shadow-sm">
        <ChartColumn className="mx-auto h-10 w-10 text-sky/50" />
        <h3 className="mt-4 text-[16px] font-bold text-ink">No activity yet</h3>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
          {!topPosts.length
            ? 'Publish a post and sync your channels — likes, reach, and comments will show up here.'
            : 'Your published posts don’t have engagement synced yet. Connect Meta and sync insights to see real activity here.'}
        </p>
        <button
          type="button"
          onClick={onDraft}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sky-bright"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Draft with Freya
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-[16px] font-bold text-ink">Top posts</h3>
            <p className="text-[12px] text-muted">Ranked by real likes, comments, and reach</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-soft px-3 py-1 text-[12px] font-bold text-sky">
            <TrendingUp className="h-3.5 w-3.5" />
            {(totals.likes + totals.comments).toLocaleString()} engagements
          </span>
        </div>

        {podium.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-muted">No activity yet</p>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-3 md:items-end md:gap-4 md:p-6">
            {[
              { post: second, place: 2, height: 'md:min-h-[280px]', ring: 'ring-slate-200', badge: 'bg-slate-300 text-slate-800' },
              { post: first, place: 1, height: 'md:min-h-[340px]', ring: 'ring-amber-300', badge: 'bg-amber-400 text-white' },
              { post: third, place: 3, height: 'md:min-h-[240px]', ring: 'ring-orange-200', badge: 'bg-orange-300 text-orange-950' },
            ].map(({ post, place, height, ring, badge }) =>
              post ? (
                <article
                  key={post.id}
                  className={`relative overflow-hidden rounded-2xl ${height} ${place === 1 ? 'md:order-2' : place === 2 ? 'md:order-1' : 'md:order-3'}`}
                >
                  {post.image?.trim() ? (
                    <img src={post.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-soft via-white to-amber-50 text-[13px] font-semibold text-muted">
                      No media
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/25 to-transparent" />
                  <div className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 ${ring}`} />
                  <span
                    className={`absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-extrabold shadow-md ${badge}`}
                  >
                    {place}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="line-clamp-2 text-[14px] font-bold leading-snug drop-shadow">{post.caption}</p>
                    <div className="mt-2 flex items-center gap-3 text-[12px] font-semibold text-white/90">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" /> {post.likes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {post.views.toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" /> {post.comments}
                      </span>
                    </div>
                  </div>
                </article>
              ) : null,
            )}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-soft text-sky">
              <ChartColumn className="h-4 w-4" />
            </span>
            Totals
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {pulse.map((m) => {
              const Icon = m.icon
              return (
                <div
                  key={m.label}
                  className={`rounded-2xl bg-gradient-to-br ${m.tone} p-4 text-white shadow-sm`}
                >
                  <Icon className="h-4 w-4 opacity-90" />
                  <p className="mt-3 text-[11px] font-bold tracking-wide text-white/80 uppercase">{m.label}</p>
                  <p className="text-[22px] font-extrabold leading-tight">
                    {m.value >= 1000
                      ? `${(m.value / 1000).toFixed(1).replace(/\.0$/, '')}k`
                      : m.value.toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {pulse
              .filter((m) => m.value > 0)
              .map((m) => {
                const Icon = m.icon
                return (
                  <span
                    key={`chip-${m.label}`}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${m.soft}`}
                  >
                    <Icon className="h-3 w-3" />
                    {m.label} {m.value.toLocaleString()}
                  </span>
                )
              })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
              <Heart className="h-4 w-4" />
            </span>
            Engagement mix
          </h3>
          {mix.length === 0 ? (
            <p className="text-[13px] text-muted">No likes, comments, or shares recorded yet.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <div
                className="relative h-36 w-36 shrink-0 rounded-full shadow-inner"
                style={{
                  background: `conic-gradient(${mix
                    .map((m, i) => {
                      const start = mix.slice(0, i).reduce((a, x) => a + x.pct, 0)
                      const end = start + m.pct
                      return `${m.color} ${start}% ${end}%`
                    })
                    .join(', ')})`,
                }}
              >
                <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                  <span className="text-[16px] font-extrabold text-ink">{engagementTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                {mix.map((m) => (
                  <div key={m.key}>
                    <div className="mb-1 flex items-center justify-between text-[12px] font-bold">
                      <span className="flex items-center gap-2 text-ink">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                        {m.key}
                      </span>
                      <span className="text-slate-500">
                        {m.value.toLocaleString()} · {m.pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
          <h3 className="mb-3 text-[15px] font-bold text-ink">More published posts</h3>
          {topPosts.slice(3, 9).length === 0 ? (
            <p className="text-[13px] text-muted">Only your top posts so far.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {topPosts.slice(3, 9).map((post) => (
                <div key={post.id} className="group relative aspect-square overflow-hidden rounded-xl">
                  {post.image?.trim() ? (
                    <img
                      src={post.image}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-soft to-amber-50 text-[11px] font-semibold text-muted">
                      No media
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-90" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                    <p className="line-clamp-2 text-[11px] font-semibold leading-snug">{post.caption}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-white/90">
                      <span className="inline-flex items-center gap-0.5">
                        <Heart className="h-3 w-3 fill-rose-400 text-rose-400" /> {post.likes}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-mid via-[#16324a] to-[#0e7490] p-5 text-white shadow-lg shadow-sky/15">
          {first?.image?.trim() ? (
            <img
              src={first.image}
              alt=""
              className="mb-4 h-28 w-full rounded-xl object-cover ring-2 ring-white/20"
            />
          ) : null}
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-sky-muted uppercase">
            <Sparkles className="h-3.5 w-3.5 text-sunshine" />
            Freya
          </div>
          <p className="mt-2 text-[14px] leading-relaxed font-medium">
            {first
              ? `Your top post has ${first.likes.toLocaleString()} likes and ${first.comments.toLocaleString()} comments. I can draft a follow-up in a similar style.`
              : 'I can draft your next post from a short brief.'}
          </p>
          <button
            type="button"
            onClick={onDraft}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-sky hover:bg-sky-soft"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Draft with Freya
          </button>
        </section>
      </div>
    </div>
  )
}


type CalView = 'day' | 'week' | 'month'
type CalColor = 'pink' | 'blue' | 'mint' | 'amber' | 'coral'
type CalEvent = {
  id: string
  day: number
  title: string
  color: CalColor
  time?: string
  postId?: string
}

const CHIP: Record<string, string> = {
  pink: 'bg-gradient-to-br from-rose-500 to-rose-400 text-white shadow-sm shadow-rose-300/50 ring-1 ring-rose-400/40',
  blue: 'bg-gradient-to-br from-sky-bright to-sky text-white shadow-sm shadow-sky/40 ring-1 ring-sky/50',
  mint: 'bg-gradient-to-br from-emerald-500 to-mint text-white shadow-sm shadow-emerald-300/50 ring-1 ring-emerald-400/40',
  amber: 'bg-gradient-to-br from-amber-500 to-sunshine text-navy-deep shadow-sm shadow-amber-300/50 ring-1 ring-amber-400/50',
  coral: 'bg-gradient-to-br from-orange-500 to-peach text-white shadow-sm shadow-orange-300/50 ring-1 ring-orange-400/40',
}

const CHIP_SOFT: Record<string, string> = {
  pink: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  blue: 'bg-sky-100 text-sky-bright ring-1 ring-sky/40',
  mint: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  amber: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  coral: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
}

const LABEL: Record<string, string> = {
  pink: 'Product',
  blue: 'Promo',
  mint: 'Community',
  amber: 'Fresh drop',
  coral: 'Campaign',
}

const WEEKDAY_TONE = [
  'text-rose-500',
  'text-sky-bright',
  'text-sky-bright',
  'text-emerald-600',
  'text-amber-600',
  'text-orange-500',
  'text-coral',
]

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function colorForTag(tag: string): CalColor {
  const t = tag.toLowerCase()
  if (/(product|drop|arrival)/.test(t)) return 'pink'
  if (/(promo|sale|offer|deal)/.test(t)) return 'blue'
  if (/(community|bts|story|team)/.test(t)) return 'mint'
  if (/(campaign|reel|ads)/.test(t)) return 'coral'
  return 'amber'
}

function formatCalTime(iso?: string) {
  if (!iso) return '10:00'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '10:00'
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function eventTime(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const hour = 8 + (n % 10)
  const min = n % 2 === 0 ? '00' : '30'
  return `${hour}:${min}`
}

function dayUnderPoint(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y)
  const cell = el?.closest?.('[data-cal-day]') as HTMLElement | null
  if (!cell) return null
  const day = Number(cell.dataset.calDay)
  return Number.isFinite(day) && day > 0 ? day : null
}

function ContentCalendar() {
  const { posts, refresh, createPost, updatePost } = useContent()
  const { backend } = useBackendMode()
  const calNow = useMemo(() => new Date(), [])
  const YEAR = calNow.getFullYear()
  const MONTH = calNow.getMonth()
  const TODAY = calNow.getDate()
  const DAYS_IN_MONTH = new Date(YEAR, MONTH + 1, 0).getDate()
  const MONTH_NAME = calNow.toLocaleString('en-US', { month: 'long' })

  const postsAsEvents = useMemo(() => {
    const list: CalEvent[] = []
    for (const p of posts) {
      if (!p.scheduledAt) continue
      const d = new Date(p.scheduledAt)
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== YEAR || d.getMonth() !== MONTH) continue
      const title = (p.caption || p.tag || 'Post').replace(/\s+/g, ' ').trim().slice(0, 42)
      list.push({
        id: p.id,
        postId: p.id,
        day: d.getDate(),
        title,
        color: colorForTag(p.tag || 'Update'),
        time: formatCalTime(p.scheduledAt),
      })
    }
    return list
  }, [posts, YEAR, MONTH])

  const [dayOverrides, setDayOverrides] = useState<Record<string, number>>({})
  const events = useMemo(
    () => postsAsEvents.map((e) => ({ ...e, day: dayOverrides[e.id] ?? e.day })),
    [postsAsEvents, dayOverrides],
  )

  const [view, setView] = useState<CalView>('month')
  const [focusDay, setFocusDay] = useState(TODAY)
  const [overDay, setOverDay] = useState<number | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; title: string; color: string } | null>(
    null,
  )
  const [moveToast, setMoveToast] = useState<string | null>(null)
  const [freyaNote, setFreyaNote] = useState<string | null>(null)
  const [planning, setPlanning] = useState(false)

  const dragRef = useRef<{
    id: string
    fromDay: number
    title: string
    color: string
    moved: boolean
  } | null>(null)
  const suppressClick = useRef(false)

  const first = new Date(YEAR, MONTH, 1)
  const startPad = first.getDay()
  const monthCells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
  ]
  while (monthCells.length % 7 !== 0) monthCells.push(null)

  const weekOrigin = (() => {
    const dow = new Date(YEAR, MONTH, focusDay).getDay()
    return focusDay - dow
  })()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = weekOrigin + i
    return d >= 1 && d <= DAYS_IN_MONTH ? d : null
  })

  function moveEvent(id: string, day: number) {
    setDayOverrides((prev) => ({ ...prev, [id]: day }))
    const prev = events.find((e) => e.id === id)
    if (prev && prev.day !== day) {
      window.setTimeout(() => {
        setMoveToast(`Moved “${prev.title}” to ${MONTH_NAME} ${day}`)
        setFocusDay(day)
      }, 0)
      window.setTimeout(() => setMoveToast(null), 2800)
    }

    const post = posts.find((p) => p.id === id)
    if (post) {
      const base = post.scheduledAt ? new Date(post.scheduledAt) : new Date(YEAR, MONTH, day, 10, 0)
      const next = new Date(YEAR, MONTH, day, base.getHours(), base.getMinutes(), 0, 0)
      void Promise.resolve(
        updatePost(id, {
          scheduledAt: next.toISOString(),
          status: post.status === 'published' ? 'scheduled' : post.status,
          caption: post.caption,
          tag: post.tag || 'Update',
          platforms: post.platforms?.length ? post.platforms : [post.platform],
        }),
      ).catch(() => {
        setFreyaNote('Couldn’t save the new day. Try again.')
      })
    }
  }

  async function freyaPlanWeek() {
    if (planning) return
    setPlanning(true)
    setFreyaNote(null)
    try {
      if (backend) {
        const data = await apiFetch<{
          ok: boolean
          offline?: boolean
          note?: string
          posts?: Array<{ id: string; day: number; title: string }>
        }>('/api/content/plan-week', {
          method: 'POST',
          body: JSON.stringify({ anchorDate: new Date(YEAR, MONTH, TODAY).toISOString() }),
        })
        await refresh()
        setDayOverrides({})
        const count = data.posts?.length ?? 0
        const offlineBit = data.offline
          ? ' (offline sketch — add an AI key for live Freya)'
          : ''
        setFreyaNote(
          (data.note?.trim() ||
            `Freya added ${count} draft${count === 1 ? '' : 's'} for your week.`) + offlineBit,
        )
        const firstDay = data.posts?.[0]?.day ?? TODAY
        setView('week')
        setFocusDay(Math.min(DAYS_IN_MONTH, Math.max(1, firstDay)))
        return
      }

      const ideas = [
        {
          offset: 0,
          hour: 10,
          tag: 'Update',
          caption: 'Fresh week energy — here’s what we’re sharing first. Message us if you want first pick.',
        },
        {
          offset: 1,
          hour: 11,
          tag: 'Product',
          caption: 'A closer look at something worth saving. Message us for details when you’re ready.',
        },
        {
          offset: 3,
          hour: 12,
          tag: 'Tips',
          caption: 'A quick tip you can use today. Reply if you want this tailored for you.',
        },
        {
          offset: 5,
          hour: 17,
          tag: 'Promo',
          caption: 'A little midweek love. Ask about this week’s pick and we’ll help you choose.',
        },
        {
          offset: 6,
          hour: 10,
          tag: 'Community',
          caption: 'Weekend plans? Come see what’s new or message us to set something aside.',
        },
      ]
      for (const idea of ideas) {
        const when = new Date(
          YEAR,
          MONTH,
          Math.min(DAYS_IN_MONTH, TODAY + idea.offset),
          idea.hour,
          0,
        )
        await createPost({
          caption: idea.caption,
          tag: idea.tag,
          image: '',
          status: 'draft',
          scheduledAt: when.toISOString(),
          platforms: ['Instagram', 'Facebook'],
        })
      }
      setDayOverrides({})
      setFreyaNote('Freya sketched 5 local drafts for your week. Review them under Posts → Drafts.')
      setView('week')
      setFocusDay(TODAY)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Couldn’t plan the week'
      setFreyaNote(message)
    } finally {
      setPlanning(false)
    }
  }

  function shiftFocus(delta: number) {
    setFocusDay((d) => Math.min(DAYS_IN_MONTH, Math.max(1, d + delta)))
  }

  const endDragRef = useRef<(clientX: number, clientY: number) => void>(() => {})
  endDragRef.current = (clientX: number, clientY: number) => {
    const active = dragRef.current
    dragRef.current = null
    setDragId(null)
    setGhost(null)
    setOverDay(null)
    if (!active) return
    if (active.moved) suppressClick.current = true
    const day = dayUnderPoint(clientX, clientY)
    if (day && day !== active.fromDay) moveEvent(active.id, day)
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const active = dragRef.current
      if (!active) return
      active.moved = true
      setGhost({ x: e.clientX, y: e.clientY, title: active.title, color: active.color })
      setOverDay(dayUnderPoint(e.clientX, e.clientY))
    }
    function onUp(e: PointerEvent) {
      if (!dragRef.current) return
      endDragRef.current(e.clientX, e.clientY)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  function startDrag(ev: CalEvent, e: ReactPointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      id: ev.id,
      fromDay: ev.day,
      title: ev.title,
      color: ev.color,
      moved: false,
    }
    setDragId(ev.id)
    setGhost({ x: e.clientX, y: e.clientY, title: ev.title, color: ev.color })
    setOverDay(ev.day)
  }

  function EventChip({ ev, large }: { ev: CalEvent; large?: boolean }) {
    const dragging = dragId === ev.id
    const timeLabel = ev.time || eventTime(ev.id)
    return (
      <div
        onPointerDown={(e) => startDrag(ev, e)}
        className={`group flex touch-none items-center gap-1 font-semibold select-none ${
          dragging ? 'opacity-30' : 'cursor-grab active:cursor-grabbing'
        } ${CHIP[ev.color] || CHIP.blue} ${
          large ? 'rounded-xl px-2.5 py-2.5 text-[13px]' : 'rounded-md px-1 py-0.5 text-[10px]'
        } ${dragging ? '' : 'hover:brightness-110 hover:ring-2 hover:ring-white/60'}`}
        title="Drag to another day"
      >
        <GripVertical
          className={`shrink-0 opacity-70 group-hover:opacity-100 ${large ? 'h-4 w-4' : 'h-3 w-3'}`}
        />
        {large ? (
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-bold">{ev.title}</div>
                <div className="mt-0.5 text-[11px] font-medium opacity-80">
                  {LABEL[ev.color] || 'Post'} · {timeLabel}
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold opacity-80">{timeLabel}</span>
            </div>
          </div>
        ) : (
          <span className="min-w-0 truncate">{ev.title}</span>
        )}
      </div>
    )
  }

  function DropCell({
    day,
    children,
    className,
    onActivate,
  }: {
    day: number | null
    children: ReactNode
    className: string
    onActivate?: () => void
  }) {
    const isOver = day != null && overDay === day && dragId != null
    return (
      <div
        data-cal-day={day ?? undefined}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          onActivate?.()
        }}
        className={`${className} ${
          isOver
            ? 'border-sky-bright bg-sky-100 ring-2 ring-sky shadow-[inset_0_0_0_1px_rgba(14,165,233,0.45)]'
            : ''
        } ${dragId && day ? 'transition-colors' : ''}`}
      >
        {isOver && (
          <div className="pointer-events-none mb-1 rounded-md bg-gradient-to-r from-sky-bright to-sky px-1.5 py-0.5 text-center text-[9px] font-bold tracking-wide text-white uppercase shadow-sm">
            Drop here
          </div>
        )}
        {children}
      </div>
    )
  }

  const focusEvents = events
    .filter((e) => e.day === focusDay)
    .sort((a, b) => (a.time || eventTime(a.id)).localeCompare(b.time || eventTime(b.id)))
  const focusDate = new Date(YEAR, MONTH, focusDay)
  const focusLabel = focusDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const nearbyDays =
    view === 'day'
      ? Array.from({ length: 7 }, (_, i) => focusDay - 3 + i).filter(
          (d) => d >= 1 && d <= DAYS_IN_MONTH,
        )
      : []

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky/20 bg-white shadow-lg shadow-sky/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-sky-soft via-amber-50/80 to-rose-50/70" />
      <div className="pointer-events-none absolute -top-8 right-8 h-36 w-36 rounded-full bg-sunshine/25 blur-3xl" />
      <div className="pointer-events-none absolute top-4 left-1/3 h-24 w-24 rounded-full bg-mint/20 blur-2xl" />

      {ghost && (
        <div
          className={`pointer-events-none fixed z-[80] max-w-[200px] truncate rounded-lg px-2.5 py-1.5 text-[12px] font-bold shadow-xl ring-2 ring-white ${CHIP[ghost.color] || CHIP.blue}`}
          style={{
            left: ghost.x + 12,
            top: ghost.y + 12,
          }}
        >
          <span className="inline-flex items-center gap-1">
            <GripVertical className="h-3 w-3 opacity-80" />
            {ghost.title}
          </span>
        </div>
      )}

      {(moveToast || dragId) && (
        <div className="absolute top-3 right-3 z-20 max-w-[260px]">
          {moveToast && (
            <div className="mb-2 rounded-xl bg-navy-deep px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg">
              {moveToast}
            </div>
          )}
          {dragId && !moveToast && (
            <div className="rounded-xl bg-gradient-to-r from-sky-bright to-sky px-3.5 py-2 text-[12px] font-bold text-white shadow-lg shadow-sky/40">
              Drop on a day to reschedule
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-sky/15 px-4 py-3.5 md:px-5">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold text-ink">
            {view === 'month' && `${MONTH_NAME} ${YEAR}`}
            {view === 'week' && `Week of ${MONTH_NAME} ${Math.max(1, weekOrigin)}`}
            {view === 'day' && focusLabel}
          </h3>
          <p className="text-[12px] text-muted">
            <span className="font-semibold text-sky-bright">Drag posts</span> between days — grab the
            handle
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-sky/20">
            {(
              [
                { id: 'day' as const, label: 'Day', icon: CalendarIcon },
                { id: 'week' as const, label: 'Week', icon: CalendarRange },
                { id: 'month' as const, label: 'Month', icon: CalendarDays },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                  view === v.id
                    ? 'bg-gradient-to-r from-sky-bright to-sky text-white shadow-sm shadow-sky/30'
                    : 'text-slate-500 hover:bg-sky-soft/60 hover:text-ink'
                }`}
              >
                <v.icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            ))}
          </div>

          {view !== 'month' && (
            <div className="inline-flex items-center gap-1 rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-amber-200/80">
              <button
                type="button"
                onClick={() => shiftFocus(view === 'week' ? -7 : -1)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-ink"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setFocusDay(TODAY)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftFocus(view === 'week' ? 7 : 1)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-ink"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => void freyaPlanWeek()}
            disabled={planning}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-sky-bright px-3.5 py-2 text-[12px] font-bold text-white shadow-md shadow-sky/40 hover:brightness-110 disabled:opacity-70"
          >
            {planning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {planning ? 'Planning…' : 'Freya, plan my week'}
          </button>
        </div>
      </div>

      <div className={`relative p-4 md:p-5 ${dragId ? 'cursor-grabbing' : ''}`}>
        {freyaNote && (
          <p className="mb-4 rounded-xl border border-sky/25 bg-gradient-to-r from-sky-soft to-mint/20 px-3.5 py-2.5 text-[12px] font-semibold text-sky-bright shadow-sm">
            {freyaNote}
          </p>
        )}

        {view === 'month' && (
          <>
            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-bold tracking-wide uppercase">
              {WEEKDAY.map((d, i) => (
                <div key={d} className={WEEKDAY_TONE[i]}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 rounded-2xl bg-gradient-to-br from-sky-soft/50 via-white to-amber-50/40 p-2 ring-1 ring-sky/15">
              {monthCells.map((day, idx) => {
                const dayEvents = day ? events.filter((e) => e.day === day) : []
                const isToday = day === TODAY
                const isFocus = day === focusDay
                return (
                  <DropCell
                    key={idx}
                    day={day}
                    onActivate={() => {
                      if (!day) return
                      setFocusDay(day)
                    }}
                    className={`min-h-[100px] rounded-xl border p-2 ${
                      !day
                        ? 'pointer-events-none border-transparent bg-transparent opacity-0'
                        : isToday
                          ? 'border-sky-bright/50 bg-gradient-to-b from-sky-100 to-white shadow-md shadow-sky/20'
                          : isFocus
                            ? 'border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-sm'
                            : 'border-white/80 bg-white/90 hover:border-sky/30 hover:shadow-sm'
                    }`}
                  >
                    {day && (
                      <>
                        <div className="mb-1 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFocusDay(day)
                              setView('day')
                            }}
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                              isToday
                                ? 'bg-gradient-to-br from-sky-bright to-sky text-white shadow-sm'
                                : isFocus
                                  ? 'bg-amber-400 text-navy-deep'
                                  : 'text-slate-600 hover:bg-sky-soft'
                            }`}
                          >
                            {day}
                          </button>
                          {dayEvents.length > 1 && (
                            <span className="rounded-full bg-navy-mid/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 4).map((ev) => (
                            <EventChip key={ev.id} ev={ev} />
                          ))}
                          {dayEvents.length > 4 && (
                            <div className="text-[10px] font-semibold text-sky-bright">
                              +{dayEvents.length - 4} more
                            </div>
                          )}
                          {dayEvents.length === 0 && dragId && (
                            <p className="py-2 text-center text-[10px] font-semibold text-sky/50">
                              Drop
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </DropCell>
                )
              })}
            </div>
          </>
        )}

        {view === 'week' && (
          <div className="grid grid-cols-1 gap-2 rounded-2xl bg-gradient-to-br from-sky-soft/40 via-white to-rose-50/30 p-2 ring-1 ring-sky/15 md:grid-cols-7">
            {weekDays.map((day, i) => {
              const dayEvents = day ? events.filter((e) => e.day === day) : []
              const isToday = day === TODAY
              return (
                <DropCell
                  key={i}
                  day={day}
                  onActivate={() => {
                    if (!day) return
                    setFocusDay(day)
                    setView('day')
                  }}
                  className={`min-h-[200px] rounded-xl border p-3 ${
                    !day
                      ? 'border-dashed border-slate-200 bg-slate-50/80 opacity-50'
                      : isToday
                        ? 'border-sky-bright/50 bg-gradient-to-b from-sky-100 to-white shadow-md shadow-sky/15'
                        : 'border-white bg-white/95 hover:border-sky/25'
                  }`}
                >
                  {day ? (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div
                            className={`text-[11px] font-bold tracking-wide uppercase ${WEEKDAY_TONE[i]}`}
                          >
                            {WEEKDAY[i]}
                          </div>
                          <div
                            className={`text-[18px] font-bold ${isToday ? 'text-sky-bright' : 'text-ink'}`}
                          >
                            {day}
                          </div>
                        </div>
                        {isToday && (
                          <span className="rounded-full bg-gradient-to-r from-sky-bright to-sky px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {dayEvents.length === 0 && !dragId && (
                          <p className="text-[11px] font-medium text-slate-400">No posts</p>
                        )}
                        {dayEvents.map((ev) => (
                          <div key={ev.id}>
                            <div className="mb-0.5 text-[10px] font-bold text-slate-500">
                              {ev.time || eventTime(ev.id)}
                            </div>
                            <EventChip ev={ev} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400">Outside month</p>
                  )}
                </DropCell>
              )
            })}
          </div>
        )}

        {view === 'day' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto rounded-2xl bg-gradient-to-r from-sky-soft/60 via-amber-50/50 to-rose-50/40 p-2 ring-1 ring-sky/15 pb-2">
              {nearbyDays.map((day) => {
                const count = events.filter((e) => e.day === day).length
                const isToday = day === TODAY
                const isFocus = day === focusDay
                const dow = new Date(YEAR, MONTH, day).getDay()
                return (
                  <DropCell
                    key={day}
                    day={day}
                    onActivate={() => setFocusDay(day)}
                    className={`min-w-[72px] shrink-0 rounded-xl border px-2 py-2 text-center ${
                      isFocus
                        ? 'border-sky-bright bg-gradient-to-b from-sky-100 to-white shadow-md shadow-sky/20'
                        : isToday
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-white bg-white/90 hover:border-sky/30'
                    }`}
                  >
                    <div className={`text-[10px] font-bold uppercase ${WEEKDAY_TONE[dow]}`}>
                      {WEEKDAY[dow]}
                    </div>
                    <div
                      className={`text-[16px] font-bold ${isToday ? 'text-sky-bright' : 'text-ink'}`}
                    >
                      {day}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${count ? 'text-rose-500' : 'text-slate-400'}`}
                    >
                      {count} post{count === 1 ? '' : 's'}
                    </div>
                  </DropCell>
                )
              })}
            </div>

            <DropCell
              day={focusDay}
              className="rounded-2xl border border-sky/20 bg-gradient-to-br from-white via-sky-soft/30 to-amber-50/40 p-4 shadow-inner"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-sky-bright">{focusLabel}</p>
                  <p className="text-[14px] font-bold text-ink">
                    {focusEvents.length === 0
                      ? 'Nothing scheduled — drop a post here'
                      : `${focusEvents.length} post${focusEvents.length === 1 ? '' : 's'} · drag to move`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setView('week')}
                    className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-sky-bright ring-1 ring-sky/30 hover:bg-sky-soft"
                  >
                    Week view
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('month')}
                    className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50"
                  >
                    Month view
                  </button>
                </div>
              </div>

              {focusEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-sky/30 bg-white/80 px-4 py-12 text-center">
                  <p className="text-[13px] font-semibold text-ink">Free day</p>
                  <p className="mt-1 text-[12px] text-muted">
                    Drag a post from the day strip above, or switch to Week / Month.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {focusEvents.map((ev) => (
                    <EventChip key={ev.id} ev={ev} large />
                  ))}
                </div>
              )}
            </DropCell>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-sky/15 pt-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1 font-bold text-ink">
            <GripVertical className="h-3.5 w-3.5 text-sky-bright" />
            Types
          </span>
          {Object.entries(LABEL).map(([key, label]) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${CHIP_SOFT[key]}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  key === 'pink'
                    ? 'bg-rose-500'
                    : key === 'blue'
                      ? 'bg-sky'
                      : key === 'mint'
                        ? 'bg-mint'
                        : key === 'amber'
                          ? 'bg-sunshine'
                          : 'bg-orange-400'
                }`}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
