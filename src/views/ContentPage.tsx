import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, Fragment } from 'react'
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
  MessageCircle,
  MousePointerClick,
  Pencil,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { CALENDAR_EVENTS, type ContentPost } from '../data/mockData'
import { CreatePostModal } from '../components/CreatePostModal'
import { PageHero } from '../components/PageHero'
import { PlatformIcon } from '../components/PlatformIcon'
import { postPlatforms, useContent } from '../context/ContentContext'
import { useTemplates } from '../context/TemplatesContext'

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
  const { posts } = useContent()
  const { saveFromPost, useTemplate } = useTemplates()
  const location = useLocation()
  const navigate = useNavigate()

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
      setFilter('all')
      setFocusPostId(id)
      window.setTimeout(() => {
        document.getElementById(`post-${id}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 80)
      window.setTimeout(() => setFocusPostId(null), 3500)
    }
    navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate, useTemplate])

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
    .sort((a, b) => b.likes - a.likes)

  const totals = topPosts.reduce(
    (acc, p) => ({
      likes: acc.likes + p.likes,
      views: acc.views + p.views,
      comments: acc.comments + p.comments,
      clicks: acc.clicks + Math.round(p.views * 0.08),
    }),
    { likes: 0, views: 0, comments: 0, clicks: 0 },
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

      <div className="mb-4 inline-flex rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-rose-100">
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
                ? 'bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-sm'
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
                ['draft', 'Draft'],
                ['scheduled', 'Scheduled'],
                ['published', 'Published'],
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
                {post.image ? (
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
        </>
      )}

      {tab === 'calendar' && <ContentCalendar />}

      {tab === 'insights' && (
        <ContentInsights
          topPosts={topPosts}
          totals={totals}
          onDraft={() => {
            setCreateCaption(
              'Close-up hero shot energy 🥐 Fresh batch, soft light, soft CTA — Freya style.',
            )
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
  totals: { likes: number; views: number; comments: number; clicks: number }
  onDraft: () => void
}) {
  const podium = topPosts.slice(0, 3)
  const [first, second, third] = [podium[0], podium[1], podium[2]]
  const engagementTotal = totals.likes + totals.comments + totals.clicks || 1
  const mix = [
    { key: 'Likes', value: totals.likes, color: '#fb7185', pct: Math.round((totals.likes / engagementTotal) * 100) },
    { key: 'Comments', value: totals.comments, color: '#fbbf24', pct: Math.round((totals.comments / engagementTotal) * 100) },
    { key: 'Clicks', value: totals.clicks, color: '#38bdf8', pct: Math.round((totals.clicks / engagementTotal) * 100) },
  ]

  const weekBars = [
    { day: 'Mon', v: 42 },
    { day: 'Tue', v: 55 },
    { day: 'Wed', v: 48 },
    { day: 'Thu', v: 72 },
    { day: 'Fri', v: 88 },
    { day: 'Sat', v: 96 },
    { day: 'Sun', v: 64 },
  ]
  const maxBar = Math.max(...weekBars.map((b) => b.v))

  const heat = [
    [12, 18, 22, 40, 55, 70, 48],
    [8, 14, 28, 52, 78, 92, 60],
    [6, 10, 16, 30, 44, 58, 36],
    [4, 8, 12, 20, 28, 34, 22],
  ]
  const heatRows = ['6am', '9am', '12pm', '6pm']
  const heatDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  function heatColor(v: number) {
    if (v >= 80) return 'bg-rose-500'
    if (v >= 60) return 'bg-orange-400'
    if (v >= 40) return 'bg-amber-300'
    if (v >= 20) return 'bg-sky-200'
    return 'bg-slate-100'
  }

  const pulse = [
    {
      label: 'Likes',
      value: totals.likes,
      delta: '+12%',
      icon: Heart,
      fill: 78,
      days: [38, 52, 44, 61, 78, 96, 70],
      tone: 'from-rose-500 to-orange-400',
      soft: 'bg-rose-50 text-rose-600',
      bar: 'bg-rose-400',
    },
    {
      label: 'Reach',
      value: totals.views,
      delta: '+18%',
      icon: Eye,
      fill: 92,
      days: [48, 55, 62, 70, 82, 100, 76],
      tone: 'from-sky to-cyan-400',
      soft: 'bg-sky-soft text-sky',
      bar: 'bg-sky',
    },
    {
      label: 'Clicks',
      value: totals.clicks,
      delta: '+9%',
      icon: MousePointerClick,
      fill: 64,
      days: [22, 28, 26, 40, 48, 58, 42],
      tone: 'from-sky-bright to-coral',
      soft: 'bg-sky-soft text-sky-bright',
      bar: 'bg-sky',
    },
    {
      label: 'Comments',
      value: totals.comments,
      delta: '+5%',
      icon: MessageCircle,
      fill: 48,
      days: [12, 16, 14, 22, 28, 34, 24],
      tone: 'from-amber-400 to-orange-300',
      soft: 'bg-amber-50 text-amber-700',
      bar: 'bg-amber-400',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Visual podium */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-[16px] font-bold text-ink">This week&apos;s winners</h3>
            <p className="text-[12px] text-muted">Ranked by likes — tap into what people loved</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            +18% engagement
          </span>
        </div>

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
                <img src={post.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/25 to-transparent" />
                <div className={`absolute inset-0 ring-2 ${ring} rounded-2xl pointer-events-none`} />
                <span
                  className={`absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-extrabold shadow-md ${badge}`}
                >
                  {place}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="line-clamp-2 text-[14px] font-bold leading-snug drop-shadow">
                    {post.caption}
                  </p>
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
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Weekly engagement bars */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-soft text-sky">
                <ChartColumn className="h-4 w-4" />
              </span>
              Engagement by day
            </h3>
            <span className="text-[11px] font-bold text-slate-400">Last 7 days</span>
          </div>
          <div className="flex h-48 items-stretch gap-2.5">
            {weekBars.map((b) => (
              <div key={b.day} className="flex min-h-0 flex-1 flex-col items-center gap-2">
                <div className="relative flex min-h-0 w-full flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-[44px] rounded-t-xl transition ${
                      b.v === maxBar
                        ? 'bg-gradient-to-t from-rose-500 to-orange-400 shadow-md shadow-rose-300/40'
                        : 'bg-gradient-to-t from-sky to-sky-muted'
                    }`}
                    style={{ height: `${Math.max(8, (b.v / maxBar) * 100)}%` }}
                    title={`${b.day}: ${b.v}`}
                  />
                </div>
                <span
                  className={`shrink-0 text-[11px] font-bold ${b.v === maxBar ? 'text-rose-500' : 'text-slate-400'}`}
                >
                  {b.day}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] text-muted">
            Saturdays win — Freya schedules your strongest posts then.
          </p>
        </section>

        {/* Donut + mix */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
                <Heart className="h-4 w-4" />
              </span>
              Engagement mix
            </h3>
          </div>
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
                <span className="text-[16px] font-extrabold text-ink">
                  {(totals.likes + totals.comments).toLocaleString()}
                </span>
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
                    <span className="text-slate-500">{m.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.pct}%`, background: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Heatmap + sparklines */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-[15px] font-bold text-ink">Best time to post</h3>
            <p className="text-[12px] text-muted">Hotter = more engagement from your audience</p>
          </div>
          <div className="overflow-x-auto">
            <div className="inline-grid min-w-[280px] grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-1.5">
              <div />
              {heatDays.map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-slate-400">
                  {d}
                </div>
              ))}
              {heat.map((row, ri) => (
                <Fragment key={heatRows[ri]}>
                  <div className="flex items-center text-[10px] font-bold text-slate-400">
                    {heatRows[ri]}
                  </div>
                  {row.map((v, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      title={`${heatRows[ri]} ${heatDays[ci]} · ${v}`}
                      className={`aspect-square rounded-lg ${heatColor(v)} transition hover:scale-105 hover:ring-2 hover:ring-white hover:ring-offset-1`}
                    />
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span>Cool</span>
            <div className="flex gap-1">
              {['bg-slate-100', 'bg-sky-200', 'bg-amber-300', 'bg-orange-400', 'bg-rose-500'].map((c) => (
                <span key={c} className={`h-2.5 w-4 rounded ${c}`} />
              ))}
            </div>
            <span>Hot</span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-bold text-ink">Audience pulse</h3>
              <p className="text-[12px] text-muted">How each signal climbed this week</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
              All up
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {pulse.map((m) => {
              const Icon = m.icon
              const dayMax = Math.max(...m.days)
              return (
                <div key={m.label} className="flex min-w-0 flex-col">
                  <div
                    className={`relative flex aspect-[3/5] flex-col overflow-hidden rounded-2xl bg-gradient-to-b ${m.tone} p-2.5 text-white shadow-md sm:p-3`}
                  >
                    <div className="absolute -right-2 -bottom-2 opacity-20">
                      <Icon className="h-14 w-14" strokeWidth={1.5} />
                    </div>
                    <span className="relative z-[1] flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="relative z-[1] mt-auto">
                      <p className="text-[10px] font-bold tracking-wide text-white/80 uppercase">
                        {m.label}
                      </p>
                      <p className="truncate text-[15px] font-extrabold leading-tight sm:text-[17px]">
                        {m.value >= 1000 ? `${(m.value / 1000).toFixed(1).replace(/\.0$/, '')}k` : m.value}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-white/90">{m.delta}</p>
                    </div>
                    <div className="relative z-[1] mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${Math.min(100, Math.max(18, m.fill))}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex h-10 items-end justify-between gap-0.5 px-0.5">
                    {m.days.map((d, i) => (
                      <div
                        key={i}
                        className={`w-full rounded-t-sm ${m.bar} opacity-80`}
                        style={{ height: `${Math.max(15, (d / dayMax) * 100)}%` }}
                        title={`${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]} · ${d}`}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between px-0.5 text-[8px] font-bold text-slate-400">
                    <span>M</span>
                    <span>S</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {pulse.map((m) => {
              const Icon = m.icon
              return (
                <span
                  key={`chip-${m.label}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${m.soft}`}
                >
                  <Icon className="h-3 w-3" />
                  {m.label} {m.delta}
                </span>
              )
            })}
          </div>
        </section>
      </div>

      {/* Visual strip of more posts + Freya */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
          <h3 className="mb-3 text-[15px] font-bold text-ink">More that performed</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topPosts.slice(3, 9).map((post) => (
              <div key={post.id} className="group relative aspect-square overflow-hidden rounded-xl">
                <img
                  src={post.image}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
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
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-mid via-[#16324a] to-[#0e7490] p-5 text-white shadow-lg shadow-sky/15">
          <div className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full bg-sunshine/20 blur-2xl" />
          {first && (
            <img
              src={first.image}
              alt=""
              className="mb-4 h-28 w-full rounded-xl object-cover ring-2 ring-white/20"
            />
          )}
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-sky-muted uppercase">
            <Sparkles className="h-3.5 w-3.5 text-sunshine" />
            Freya&apos;s take
          </div>
          <p className="mt-2 text-[14px] leading-relaxed font-medium">
            Close-ups like your #1 get{' '}
            <span className="rounded bg-sunshine/90 px-1 font-extrabold text-navy-deep">234%</span>{' '}
            more love. I can draft your next 3 in that style.
          </p>
          <button
            type="button"
            onClick={onDraft}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-sky hover:bg-sky-soft"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Freya, draft 3
          </button>
        </section>
      </div>
    </div>
  )
}

type CalView = 'day' | 'week' | 'month'
type CalEvent = {
  id: string
  day: number
  title: string
  color: 'pink' | 'blue' | 'mint' | 'amber' | 'coral'
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
const MONTH_NAME = 'July'
const YEAR = 2026
const MONTH = 6
const TODAY = 16
const DAYS_IN_MONTH = 31

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
  const [events, setEvents] = useState<CalEvent[]>(() =>
    CALENDAR_EVENTS.map((e, i) => ({ ...e, id: `ce${i}` })),
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
    setEvents((list) => {
      const prev = list.find((e) => e.id === id)
      if (prev && prev.day !== day) {
        window.setTimeout(() => {
          setMoveToast(`Moved “${prev.title}” to ${MONTH_NAME} ${day}`)
          setFocusDay(day)
        }, 0)
        window.setTimeout(() => setMoveToast(null), 2800)
      }
      return list.map((e) => (e.id === id ? { ...e, day } : e))
    })
  }

  function freyaPlanWeek() {
    const extras: CalEvent[] = [
      { id: `ce${Date.now()}`, day: 17, title: 'Eid kurti reel', color: 'mint' },
      { id: `ce${Date.now() + 1}`, day: 19, title: '5am BTS story', color: 'coral' },
      { id: `ce${Date.now() + 2}`, day: 22, title: 'Loyalty club CTA', color: 'blue' },
    ]
    setEvents((prev) => [...prev, ...extras])
    setFreyaNote('Freya added 3 posts — grab the ⋮⋮ handle and drop them on any day.')
    setView('week')
    setFocusDay(17)
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
                  {LABEL[ev.color] || 'Post'} · {eventTime(ev.id)}
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold opacity-80">{eventTime(ev.id)}</span>
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
    .sort((a, b) => eventTime(a.id).localeCompare(eventTime(b.id)))
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
            onClick={freyaPlanWeek}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-sky-bright px-3.5 py-2 text-[12px] font-bold text-white shadow-md shadow-sky/40 hover:brightness-110"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Freya, plan my week
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
                              {eventTime(ev.id)}
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
