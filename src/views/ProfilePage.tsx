import { Link } from 'react-router-dom'
import { Building2, Mail, Pencil, Sparkles, Target, Users } from 'lucide-react'
import { PlatformIcon } from '../components/PlatformIcon'
import { useApp } from '../context/AppContext'
import { BOUTIQUE, GOAL_OPTIONS, type Platform } from '../data/mockData'

export function ProfilePage() {
  const { profile, prefs, accountEmail } = useApp()

  if (!profile) return null

  const owner = profile.ownerName || 'You'
  const biz = profile.businessName || 'Your business'
  const industry = profile.industry?.trim() || ''
  const customers = profile.customers?.trim() || ''
  const coverSrc = profile.coverUrl || BOUTIQUE.boutiqueCounter
  const logoSrc = profile.logoUrl || BOUTIQUE.kurtiRack
  const email = accountEmail?.trim() || null
  const goalLabels = (profile.goals || [])
    .map((id) => GOAL_OPTIONS.find((g) => g.id === id)?.label)
    .filter(Boolean) as string[]

  const channels: Platform[] =
    prefs.connectedPlatforms.length > 0
      ? prefs.connectedPlatforms
      : profile.platforms.length > 0
        ? profile.platforms
        : []

  return (
    <div className="relative px-6 py-6 pb-24 md:px-8">
      <div className="pointer-events-none absolute top-0 right-1/4 h-40 w-40 rounded-full bg-sky/20 blur-3xl" />
      <div className="pointer-events-none absolute top-32 left-8 h-32 w-32 rounded-full bg-sunshine/15 blur-3xl" />

      <section className="relative mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] border border-sky/20 bg-white shadow-[0_20px_50px_-28px_rgba(14,165,233,0.45)]">
        {/* Cover — same source as Home */}
        <div className="relative h-44 w-full sm:h-52">
          <img
            key={coverSrc}
            src={coverSrc}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-navy-deep/25 via-transparent to-sky/20" />
        </div>

        <div className="relative -mt-16 px-6 pb-8 sm:px-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left">
            <div className="relative shrink-0">
              <div className="h-28 w-28 overflow-hidden rounded-full bg-white p-1 shadow-xl shadow-sky/20 ring-1 ring-sky/20 sm:h-32 sm:w-32">
                <img
                  key={logoSrc}
                  src={logoSrc}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span
                className="absolute right-2 bottom-2 h-4 w-4 rounded-full bg-online shadow-sm ring-[3px] ring-white"
                title="Online"
              />
            </div>

            <div className="mt-4 min-w-0 flex-1 sm:mt-0 sm:ml-5 sm:pb-1">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1
                    className="truncate text-[28px] font-extrabold tracking-tight sm:text-[32px]"
                    style={{ color: '#0b131e' }}
                  >
                    {owner}
                  </h1>
                  <p className="mt-0.5 text-[14px] font-semibold" style={{ color: '#0ea5e9' }}>
                    Owner · {biz}
                  </p>
                </div>
                <Link
                  to="/app/settings"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-bright to-sky px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-sky/30 hover:brightness-110"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit profile
                </Link>
              </div>

              {(industry || customers) && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {industry ? <MetaPill icon={Building2} label={industry} /> : null}
                  {customers ? <MetaPill icon={Users} label={customers} /> : null}
                </div>
              )}
            </div>
          </div>

          {(biz || industry || customers) && (
            <p className="mt-6 text-[14px] leading-relaxed" style={{ color: '#475569' }}>
              {biz ? (
                <>
                  <span style={{ color: '#0b131e', fontWeight: 700 }}>{biz}</span>
                  {industry ? <> · {industry}</> : null}
                  {customers ? <> · Serving {customers}</> : null}
                </>
              ) : (
                <>
                  {industry}
                  {customers ? <> · Serving {customers}</> : null}
                </>
              )}
            </p>
          )}

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <DetailCard icon={Mail} label="Account email" value={email || 'Not available'} />
            <DetailCard icon={Building2} label="Business" value={biz} />
            {customers ? <DetailCard icon={Users} label="Customers" value={customers} /> : null}
            <DetailCard
              icon={Sparkles}
              label="Freya tone"
              value={prefs.tone.charAt(0).toUpperCase() + prefs.tone.slice(1)}
            />
          </div>

          {goalLabels.length > 0 && (
            <div className="mt-6">
              <div
                className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase"
                style={{ color: '#94a3b8' }}
              >
                <Target className="h-3.5 w-3.5" />
                Focus
              </div>
              <div className="flex flex-wrap gap-2">
                {goalLabels.map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-gradient-to-r from-sky-soft to-sky-soft px-3.5 py-1.5 text-[12px] font-bold ring-1 ring-sky/20"
                    style={{ color: '#0284c7' }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {channels.length > 0 && (
            <div className="mt-6">
              <div
                className="mb-2.5 text-[11px] font-bold tracking-wider uppercase"
                style={{ color: '#94a3b8' }}
              >
                Channels
              </div>
              <div className="flex flex-wrap gap-2">
                {channels.map((p) => {
                  const connected = prefs.connectedPlatforms.includes(p)
                  return (
                    <span
                      key={p}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold ring-1 ${
                        connected
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-slate-50 text-slate-600 ring-slate-200'
                      }`}
                    >
                      <PlatformIcon platform={p} size={14} />
                      {p}
                      {connected ? ' · connected' : ''}
                    </span>
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

function MetaPill({ icon: Icon, label }: { icon: typeof Building2; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
      <Icon className="h-3.5 w-3.5 shrink-0 text-sky-bright" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-sky/10 bg-gradient-to-br from-sky-soft/40 to-white px-3.5 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-bright shadow-sm ring-1 ring-sky/15">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{label}</div>
        <div className="mt-0.5 truncate text-[13.5px] font-bold" style={{ color: '#0b131e' }}>
          {value}
        </div>
      </div>
    </div>
  )
}
