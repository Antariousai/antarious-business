import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Clock,
  Eye,
  Flame,
  Heart,
  Image as ImageIcon,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Banknote,
  HandCoins,
  Zap,
} from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { useApp } from '../context/AppContext'
import { useMoney } from '../context/MoneyContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { formatMoney } from '../data/moneyData'
import { CONTENT_POSTS, HOT_LEADS, STORIES, BAKERY, CALENDAR_EVENTS } from '../data/mockData'
import type { FreyaActivityItem } from '../data/freyaActivityData'
import { GOAL_OPTIONS } from '../data/mockData'

const TODAY = 16

const TODAY_SCHEDULE = [
  {
    time: '8:00 am',
    title: 'Summer berry drop',
    channel: 'Instagram',
    tone: 'from-rose-500 to-orange-400',
    image: BAKERY.berryTart,
  },
  {
    time: '11:30 am',
    title: 'Story · oven BTS',
    channel: 'Stories',
    tone: 'from-violet-500 to-fuchsia-400',
    image: BAKERY.pastryChef,
  },
  {
    time: '3:00 pm',
    title: 'Flash sale reminder',
    channel: 'Facebook',
    tone: 'from-sky-bright to-sky',
    image: BAKERY.freshBread,
  },
  {
    time: '5:30 pm',
    title: 'Closing thank-you Reel',
    channel: 'Instagram',
    tone: 'from-emerald-500 to-mint',
    image: BAKERY.cozyCafe,
  },
]

const STATUS_TONE: Record<
  FreyaActivityItem['status'],
  { dot: string; bar: string; chip: string }
> = {
  done: {
    dot: 'bg-mint shadow-sm shadow-mint/50',
    bar: 'from-emerald-500 to-mint',
    chip: 'bg-emerald-500 text-white shadow-sm shadow-emerald-300/50',
  },
  waiting: {
    dot: 'bg-sunshine shadow-sm shadow-amber-300/50',
    bar: 'from-amber-400 to-orange-400',
    chip: 'bg-amber-400 text-navy-deep shadow-sm shadow-amber-300/50',
  },
  working: {
    dot: 'bg-sky-bright shadow-sm shadow-sky/40',
    bar: 'from-sky-bright to-violet-400',
    chip: 'bg-sky-bright text-white shadow-sm shadow-sky/40',
  },
}

export function CommandCentrePage() {
  const { profile, prefs, canAccess } = useApp()
  const { monthIncome, billsToPay, cashPosition, invoicesOwed } = useMoney()
  const { items: freyaActivity, openPanel, waitingCount, approve: approveFreyaItem, approveAll } =
    useFreyaActivity()
  const [seenStories, setSeenStories] = useState<Set<string>>(() => new Set())

  const showGrowthTools = canAccess('campaigns') || canAccess('leads')
  const owner = profile?.ownerName || 'Joy'
  const biz = profile?.businessName || "Joy's Bakery"
  const industry = profile?.industry || 'bakery'
  const freyaWaiting = freyaActivity.filter((a) => a.status === 'waiting')
  const posts = freyaWaiting.filter((a) => a.kind === 'post')
  const messages = freyaWaiting.filter((a) => a.kind === 'message')
  const otherWaiting = freyaWaiting.filter((a) => a.kind !== 'post' && a.kind !== 'message')
  const needsOk = waitingCount
  const goalLabels = (profile?.goals || [])
    .map((id) => GOAL_OPTIONS.find((g) => g.id === id)?.label)
    .filter(Boolean)
    .slice(0, 2)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  function letFreyaRun() {
    approveAll()
    openPanel('activity')
  }

  const starPost = useMemo(() => {
    const top = [...CONTENT_POSTS]
      .filter((p) => p.status === 'published')
      .sort((a, b) => b.likes - a.likes)[0]
    return top
  }, [])

  const incomeRatio =
    monthIncome + billsToPay > 0 ? Math.round((monthIncome / (monthIncome + billsToPay)) * 100) : 72

  const shopInitial = (biz.trim()[0] || 'J').toUpperCase()

  return (
    <div className="space-y-6 px-6 py-6 pb-24 md:px-8">
      {/* Profile-style hero — cover + shop logo + name (Facebook / Shopify) */}
      <section className="overflow-hidden rounded-[1.75rem] bg-[#0b1220] shadow-[0_24px_48px_-28px_rgba(14,165,233,0.4)] ring-1 ring-white/10">
        {/* Cover photo */}
        <div className="relative h-36 w-full sm:h-44 md:h-52">
          <img
            src={BAKERY.bakeryCounter}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1220]/50 via-transparent to-[#0b1220]/20" />
          <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white/95 uppercase backdrop-blur-sm ring-1 ring-white/15">
            <Sparkles className="h-3 w-3 text-sunshine" />
            Today
          </span>
          {needsOk > 0 && (
            <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-1 text-[11px] font-bold text-navy-deep shadow-sm shadow-amber-400/40">
              <Clock className="h-3 w-3" />
              {needsOk} need{needsOk === 1 ? 's' : ''} OK
            </span>
          )}
        </div>

        {/* Shop identity strip */}
        <div className="relative px-5 pb-2 md:px-8">
          <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
            <div className="relative shrink-0">
              <div className="h-24 w-24 overflow-hidden rounded-2xl bg-white p-1 shadow-xl shadow-black/40 ring-4 ring-[#0b1220] sm:h-28 sm:w-28 sm:rounded-3xl">
                <img
                  src={BAKERY.croissants}
                  alt=""
                  className="h-full w-full rounded-xl object-cover sm:rounded-2xl"
                />
              </div>
              <span className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-bright to-cyan-400 text-[13px] font-extrabold text-white shadow-md ring-2 ring-[#0b1220]">
                {shopInitial}
              </span>
              <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-online ring-2 ring-white" title="Online" />
            </div>

            <div className="min-w-0 flex-1 pb-1 pt-3 sm:pt-0">
              <h2 className="truncate text-[24px] font-extrabold tracking-tight text-white sm:text-[28px]">
                {biz}
              </h2>
              <p className="mt-0.5 text-[13px] font-medium text-white/65">
                {industry ? industry.charAt(0).toUpperCase() + industry.slice(1) : 'Business'}
                {prefs.connectedPlatforms.length > 0 && (
                  <> · {prefs.connectedPlatforms.join(' · ')}</>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={letFreyaRun}
              className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-sky-bright shadow-lg shadow-sky/30 hover:bg-sky-soft"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Let Freya handle it
            </button>
          </div>
        </div>

        {/* Greeting + actions (same as before) */}
        <div className="relative px-5 pb-6 pt-4 text-white md:px-8">
          <div className="min-w-0">
            <p className="text-[18px] font-bold tracking-tight md:text-[20px]">
              {greeting}, {owner}
              {hour < 12 ? ' ☀️' : hour < 18 ? ' 🌤' : ' 🌙'}
            </p>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/75">
              Here&apos;s what&apos;s happening at {biz}
              {industry ? `, your ${industry.toLowerCase()}` : ''}.{' '}
              {needsOk > 0 ? (
                <>
                  I&apos;ve got{' '}
                  <span className="font-semibold text-sunshine">{needsOk}</span> things waiting for
                  your OK.
                </>
              ) : (
                <>You&apos;re clear — Freya&apos;s keeping things moving.</>
              )}
              {goalLabels.length > 0 && <> Focus: {goalLabels.join(' · ')}.</>}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              to="/app/content"
              state={{ openCreate: true }}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-cyan-400 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-sky/45 hover:brightness-110"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              New post
            </Link>
            {showGrowthTools && canAccess('campaigns') && (
              <Link
                to="/app/campaigns"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-fuchsia-500/40 hover:brightness-110"
              >
                <Megaphone className="h-3.5 w-3.5" />
                New campaign
              </Link>
            )}
            {showGrowthTools && canAccess('leads') && (
              <Link
                to="/app/leads"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 px-4 py-2.5 text-[13px] font-bold text-navy-deep shadow-lg shadow-orange-400/40 hover:brightness-105"
              >
                <Users className="h-3.5 w-3.5" />
                Add interested person
              </Link>
            )}
            <Link
              to="/app/inbox"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-emerald-500/40 hover:brightness-110"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Check Messages
            </Link>
          </div>
        </div>
      </section>

      {/* Stories */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-bright to-sky text-white shadow-sm shadow-sky/30">
                <ImageIcon className="h-3.5 w-3.5" />
              </span>
              Recent posts
            </h3>
            <p className="mt-0.5 text-[13px] text-muted">Tap a story to open that post</p>
          </div>
          <Link
            to="/app/content"
            className="rounded-full bg-sky-soft px-3 py-1.5 text-[13px] font-bold text-sky-bright hover:bg-sky/20"
          >
            All posts →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto rounded-[1.5rem] bg-gradient-to-r from-sky-soft/70 via-amber-50/60 to-rose-50/50 px-5 py-5 ring-1 ring-sky/15">
          {STORIES.map((s) =>
            s.id === 'create' ? (
              <Link
                key={s.id}
                to="/app/content"
                state={{ openCreate: true }}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-2"
              >
                <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gradient-to-br from-sky via-sky-bright to-violet-400 p-[2.5px] shadow-md shadow-sky/25 transition group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-violet-300/30">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                    <Plus className="h-5 w-5 text-sky-bright" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-ink">Create</span>
              </Link>
            ) : (
              <Link
                key={s.id}
                to="/app/content"
                state={{ focusPostId: s.postId }}
                onClick={() => setSeenStories((prev) => new Set(prev).add(s.id))}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-2"
              >
                <div
                  className={`relative h-[68px] w-[68px] rounded-full p-[2.5px] transition group-hover:scale-105 ${
                    seenStories.has(s.id)
                      ? 'bg-slate-300'
                      : 'bg-gradient-to-br from-coral via-peach to-sunshine shadow-md shadow-orange-300/30'
                  }`}
                >
                  <img
                    src={s.image!}
                    alt=""
                    className="h-full w-full rounded-full border-[2.5px] border-white object-cover"
                  />
                  <span className="absolute right-0.5 bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-online shadow-sm" />
                </div>
                <span className="max-w-full truncate text-[11px] font-semibold text-ink">
                  {s.label}
                </span>
              </Link>
            ),
          )}
        </div>
      </section>

      {/* Needs OK — unified Freya Activity queue */}
      <section id="needs-ok">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 text-navy-deep shadow-sm shadow-amber-300/50">
              <Clock className="h-3.5 w-3.5" />
            </span>
            Needs your OK
          </h3>
          <div className="flex items-center gap-3">
            {freyaWaiting.length > 0 && (
              <button
                type="button"
                onClick={() => approveAll()}
                className="rounded-full bg-gradient-to-r from-sky-bright to-sky px-3 py-1.5 text-[13px] font-bold text-white shadow-sm shadow-sky/30 hover:brightness-110"
              >
                Approve all
              </button>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                freyaWaiting.length > 0
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-navy-deep shadow-sm shadow-amber-300/40'
                  : 'bg-emerald-500 text-white shadow-sm shadow-emerald-300/40'
              }`}
            >
              {freyaWaiting.length} waiting
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {posts.map((item) => (
            <ApprovalCard key={item.id} item={item} onApprove={() => approveFreyaItem(item.id)} />
          ))}
          {messages.map((item) => (
            <MessageCard key={item.id} item={item} onApprove={() => approveFreyaItem(item.id)} />
          ))}
          {otherWaiting.map((item) => (
            <GenericWaitingCard
              key={item.id}
              item={item}
              onApprove={() => approveFreyaItem(item.id)}
            />
          ))}
          {!freyaWaiting.length && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-mint/15 to-sky-soft/40 px-6 py-10 text-center ring-1 ring-emerald-400/30">
              <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-mint/20 blur-2xl" />
              <p className="relative text-[15px] font-bold text-emerald-700">All clear ✨</p>
              <p className="relative mt-1 text-[13px] text-emerald-600/90">
                Nothing waiting for your OK — Freya&apos;s got the rest.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Overview grid */}
      <section>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-lg shadow-sky/10">
            <div className="flex items-center justify-between bg-gradient-to-r from-sky-soft/80 via-violet-50/60 to-rose-50/50 px-5 py-4">
              <h3 className="flex items-center gap-2 font-bold text-ink">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-sky-bright text-white shadow-sm shadow-violet-300/40">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                What Freya&apos;s up to
              </h3>
              <button
                type="button"
                onClick={() => openPanel('activity')}
                className="rounded-full bg-white/80 px-3 py-1 text-[13px] font-bold text-sky-bright shadow-sm hover:bg-white"
              >
                See all →
              </button>
            </div>
            <ul className="space-y-1 p-4">
              {freyaActivity.slice(0, 4).map((a) => {
                const tone = STATUS_TONE[a.status]
                const progress = a.status === 'done' ? 100 : a.status === 'waiting' ? 35 : 68
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => openPanel('activity')}
                      className="flex w-full gap-3 rounded-xl p-2.5 text-left transition hover:bg-sky-soft/40"
                    >
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[13.5px] font-semibold text-ink">{a.title}</div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone.chip}`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <div className="text-[12px] text-muted">{a.detail}</div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-amber-200/40 bg-white shadow-lg shadow-amber-100/50">
            <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 via-peach/30 to-rose-50/50 px-5 py-4">
              <h3 className="flex items-center gap-2 font-bold text-ink">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 text-navy-deep shadow-sm shadow-amber-300/50">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                Going out today
              </h3>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-400/90 px-2.5 py-0.5 text-[11px] font-bold text-navy-deep">
                  {TODAY_SCHEDULE.length} posts
                </span>
                <Link
                  to="/app/content"
                  state={{ tab: 'calendar' }}
                  className="rounded-full bg-white/80 px-3 py-1 text-[13px] font-bold text-amber-700 shadow-sm hover:bg-white"
                >
                  Calendar →
                </Link>
              </div>
            </div>
            <ul className="divide-y divide-amber-100/80 p-2">
              {TODAY_SCHEDULE.map((slot) => (
                <li key={slot.title}>
                  <Link
                    to="/app/content"
                    state={{ tab: 'calendar' }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-amber-50/70"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
                      <img src={slot.image} alt="" className="h-full w-full object-cover" />
                      <div
                        className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${slot.tone}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-ink">{slot.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted">
                        <span className="text-amber-700">{slot.time}</span>
                        <span className="text-slate-300">·</span>
                        <span
                          className={`rounded-full bg-gradient-to-r ${slot.tone} px-2 py-0.5 text-[10px] font-bold text-white`}
                        >
                          {slot.channel}
                        </span>
                      </div>
                    </div>
                    <Zap className="h-4 w-4 shrink-0 text-amber-400" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-amber-100 bg-gradient-to-r from-amber-50/80 to-peach/20 px-4 py-3">
              <p className="text-[12px] text-slate-600">
                Freya queued these for July {TODAY}
                {CALENDAR_EVENTS.some((e) => e.day === TODAY) ? ' — drag to reschedule anytime.' : '.'}{' '}
                <button
                  type="button"
                  onClick={() => openPanel('chat')}
                  className="font-bold text-amber-700 hover:underline"
                >
                  Talk to Freya →
                </button>
              </p>
            </div>
          </div>

          {starPost && (
            <Link
              to="/app/content"
              state={{ focusPostId: starPost.id }}
              className="group overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-lg shadow-sky/10 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/40 lg:col-span-2"
            >
              <div className="relative h-36 overflow-hidden sm:h-40">
                <img
                  src={starPost.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/80 via-sky-bright/50 to-violet-400/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/25 to-transparent" />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-mint px-2.5 py-1 text-[11px] font-bold text-white shadow-sm shadow-emerald-300/50">
                  <TrendingUp className="h-3 w-3" />
                  Star post this week
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="line-clamp-2 text-[14px] font-semibold leading-snug drop-shadow">
                    {starPost.caption}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] font-medium text-white/90">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                      <Heart className="h-3.5 w-3.5" /> {starPost.likes}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                      <Eye className="h-3.5 w-3.5" /> {starPost.views.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                      <MessageCircle className="h-3.5 w-3.5" /> {starPost.comments}
                    </span>
                    <span className="rounded-full bg-sunshine/90 px-2 py-0.5 text-[11px] font-bold text-navy-deep">
                      +13% vs average
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div
            className={`overflow-hidden rounded-2xl border border-emerald-200/40 bg-white shadow-lg shadow-emerald-100/40 ${
              canAccess('leads') ? 'lg:col-span-2' : 'lg:col-span-4'
            }`}
          >
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 via-mint/20 to-sky-soft/50 px-5 py-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-mint text-white shadow-sm shadow-emerald-300/50">
                <Wallet className="h-3.5 w-3.5" />
              </span>
              <h3 className="font-bold text-ink">Money snapshot</h3>
            </div>
            <div className="p-5">
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-mint p-3.5 text-center text-white shadow-md shadow-emerald-300/30 sm:p-4">
                  <Wallet className="absolute -right-1 -bottom-1 h-10 w-10 opacity-20" />
                  <div className="relative text-[10px] font-bold tracking-wide text-white/85 uppercase sm:text-[11px]">
                    Money in
                  </div>
                  <div className="relative mt-1 text-[20px] font-extrabold leading-tight sm:text-[22px]">
                    {formatMoney(monthIncome)}
                  </div>
                  <div className="relative mx-auto mt-2 h-1 max-w-[80%] overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${Math.min(100, incomeRatio)}%` }}
                    />
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-peach p-3.5 text-center text-white shadow-md shadow-orange-300/30 sm:p-4">
                  <Zap className="absolute -right-1 -bottom-1 h-10 w-10 opacity-20" />
                  <div className="relative text-[10px] font-bold tracking-wide text-white/85 uppercase sm:text-[11px]">
                    You owe
                  </div>
                  <div className="relative mt-1 text-[20px] font-extrabold leading-tight sm:text-[22px]">
                    {formatMoney(billsToPay)}
                  </div>
                  <div className="relative mx-auto mt-2 h-1 max-w-[80%] overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${Math.min(100, 100 - incomeRatio + 20)}%` }}
                    />
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-bright to-cyan-400 p-3.5 text-center text-white shadow-md shadow-sky/30 sm:p-4">
                  <Banknote className="absolute -right-1 -bottom-1 h-10 w-10 opacity-20" />
                  <div className="relative text-[10px] font-bold tracking-wide text-white/85 uppercase sm:text-[11px]">
                    Cash on hand
                  </div>
                  <div className="relative mt-1 text-[20px] font-extrabold leading-tight sm:text-[22px]">
                    {formatMoney(cashPosition)}
                  </div>
                  <div className="relative mx-auto mt-2 h-1 max-w-[80%] overflow-hidden rounded-full bg-white/25">
                    <div className="h-full w-[78%] rounded-full bg-white" />
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-coral p-3.5 text-center text-white shadow-md shadow-rose-300/30 sm:p-4">
                  <HandCoins className="absolute -right-1 -bottom-1 h-10 w-10 opacity-20" />
                  <div className="relative text-[10px] font-bold tracking-wide text-white/85 uppercase sm:text-[11px]">
                    Owed to you
                  </div>
                  <div className="relative mt-1 text-[20px] font-extrabold leading-tight sm:text-[22px]">
                    {formatMoney(invoicesOwed)}
                  </div>
                  <div className="relative mx-auto mt-2 h-1 max-w-[80%] overflow-hidden rounded-full bg-white/25">
                    <div className="h-full w-[62%] rounded-full bg-white" />
                  </div>
                </div>
              </div>
              <Link
                to="/app/money"
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-bright to-sky px-3.5 py-1.5 text-[13px] font-bold text-white shadow-sm shadow-sky/30 hover:brightness-110"
              >
                See finances →
              </Link>
            </div>
          </div>

          {canAccess('leads') && (
            <div className="overflow-hidden rounded-2xl border border-orange-200/40 bg-white shadow-lg shadow-orange-100/40 lg:col-span-2">
              <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 via-rose-50/60 to-amber-50/50 px-5 py-4">
                <h3 className="flex items-center gap-2 font-bold text-ink">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-coral text-white shadow-sm shadow-orange-300/40">
                    <Flame className="h-3.5 w-3.5" />
                  </span>
                  People who asked
                </h3>
                <Link
                  to="/app/leads"
                  className="rounded-full bg-gradient-to-r from-orange-400 to-coral px-3 py-1 text-[13px] font-bold text-white shadow-sm shadow-orange-300/40 hover:brightness-110"
                >
                  See all →
                </Link>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {HOT_LEADS.map((lead, i) => {
                  const tones = [
                    'from-sky-bright to-sky',
                    'from-violet-500 to-fuchsia-400',
                    'from-emerald-500 to-mint',
                    'from-amber-400 to-orange-400',
                    'from-coral to-peach',
                    'from-teal-400 to-sky',
                  ]
                  const tone = tones[i % tones.length]
                  return (
                    <Link
                      key={lead.name}
                      to="/app/leads"
                      className="group flex gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-white to-sky-soft/30 p-3 ring-1 ring-sky/15 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-sky/20"
                    >
                      <Avatar letter={lead.name.charAt(0)} size={40} color={lead.color} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-bold text-ink">{lead.name}</span>
                          <span
                            className={`rounded-full bg-gradient-to-r ${tone} px-2 py-0.5 text-[10px] font-bold text-white shadow-sm`}
                          >
                            {lead.status}
                          </span>
                        </div>
                        <p className="truncate text-[12px] text-muted">{lead.note}</p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tone}`}
                            style={{ width: `${55 + (i % 3) * 15}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ApprovalCard({ item, onApprove }: { item: FreyaActivityItem; onApprove: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-sky/15 bg-gradient-to-r from-white via-sky-soft/30 to-violet-50/30 p-4 shadow-md shadow-sky/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-200/30">
      {item.previewImage && (
        <div className="relative shrink-0 overflow-hidden rounded-xl ring-2 ring-sky/30">
          <img src={item.previewImage} alt="" className="h-16 w-16 object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-deep/30 to-transparent" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-sky px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
          <Sparkles className="h-3 w-3" />
          Freya drafted · {item.title}
        </div>
        <p className="mt-1.5 text-[14px] leading-snug text-ink">{item.previewBody || item.detail}</p>
      </div>
      <div className="flex gap-2">
        <Link
          to={item.href || '/app/content'}
          className="rounded-full border border-sky/25 bg-white px-4 py-2 text-[13px] font-semibold text-sky-bright hover:bg-sky-soft/50"
        >
          Edit in Content
        </Link>
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-violet-500 px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-sky/30 hover:brightness-110"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Approve
        </button>
      </div>
    </div>
  )
}

function MessageCard({ item, onApprove }: { item: FreyaActivityItem; onApprove: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200/40 bg-gradient-to-br from-white via-emerald-50/30 to-sky-soft/40 shadow-md shadow-emerald-100/40 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-500/10 to-sky-soft/50 px-5 py-3">
        <Avatar letter={item.recipient?.charAt(0) || 'U'} size={32} online />
        <div className="text-[13.5px] text-ink">
          Freya drafted a reply to <span className="font-bold">{item.recipient}</span>
        </div>
        <span className="ml-auto rounded-full bg-gradient-to-r from-emerald-500 to-mint px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          Messages
        </span>
      </div>
      <div className="px-5 pb-5">
        <div className="rounded-xl bg-gradient-to-r from-sky-soft to-mint/20 px-4 py-3 text-[14px] leading-relaxed text-ink ring-1 ring-sky/20">
          {item.previewBody || item.detail}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Link
            to={item.href || '/app/inbox'}
            className="rounded-full border border-sky/25 bg-white px-4 py-2 text-[13px] font-semibold text-sky-bright hover:bg-sky-soft/50"
          >
            Open Messages
          </Link>
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-mint px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-emerald-300/40 hover:brightness-110"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            Send it
          </button>
        </div>
      </div>
    </div>
  )
}

function GenericWaitingCard({
  item,
  onApprove,
}: {
  item: FreyaActivityItem
  onApprove: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200/40 bg-gradient-to-r from-amber-50/60 via-white to-rose-50/40 p-4 shadow-md shadow-amber-100/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[14px] font-bold text-ink">{item.title}</div>
          {item.storyId && (
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[10px] font-bold text-navy-deep shadow-sm shadow-amber-300/50">
              Story {item.storyStep}/4
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] text-muted">{item.detail}</p>
        {item.storyId && (
          <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
              style={{ width: `${((item.storyStep ?? 1) / 4) * 100}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {item.href && (
          <Link
            to={item.href}
            className="rounded-full border border-amber-300/50 bg-white px-4 py-2 text-[13px] font-semibold text-amber-700 hover:bg-amber-50"
          >
            {item.actionLabel || 'Open'}
          </Link>
        )}
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-[13px] font-bold text-navy-deep shadow-md shadow-amber-300/40 hover:brightness-105"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Approve
        </button>
      </div>
    </div>
  )
}
