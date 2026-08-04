import { useCallback, useEffect, useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { PageHero } from '../components/PageHero'
import { Button, Card, Input, Pill } from '../components/ui'
import { useApp } from '../context/AppContext'
import { Navigate } from 'react-router-dom'
import { SEAT_PRICE_MONTHLY, formatBdt, formatSeatPrice } from '../data/planTiers'
import { apiFetch } from '@/lib/backend/api'
import { useBackendMode } from '@/lib/backend/BackendModeContext'

type Role = 'Owner' | 'Editor' | 'Viewer'

type Seat = {
  id: string
  name: string
  role: Role
  you?: boolean
  pending?: boolean
  token?: string
}

const SEED: Seat[] = [
  { id: '1', name: 'You', role: 'Owner', you: true },
  { id: '2', name: 'Amina', role: 'Editor' },
  { id: '3', name: 'Rafi', role: 'Viewer' },
]

function roleLabel(role: string): Role {
  const r = role.toLowerCase()
  if (r === 'owner') return 'Owner'
  if (r === 'viewer') return 'Viewer'
  return 'Editor'
}

/** Scale-only team stub — seats billed separately from the plan base. */
export function TeamPage() {
  const { canAccess, entitlements, profile, seatLimit, setPurchasedSeats } = useApp()
  const { backend, ready } = useBackendMode()
  const [seats, setSeats] = useState<Seat[]>(SEED)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('Editor')
  const [saved, setSaved] = useState(false)
  const [savedNote, setSavedNote] = useState('Invite saved')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadTeam = useCallback(async () => {
    if (!backend) return
    const data = await apiFetch<{
      members: {
        id: string
        role: string
        user_id: string
        profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null
      }[]
      invites: { id: string; email: string; role: string; token?: string }[]
    }>('/api/team/invites')

    const members: Seat[] = (data.members ?? []).map((m) => {
      const profileRow = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return {
        id: m.id,
        name: profileRow?.full_name || 'Member',
        role: roleLabel(m.role),
        you: false,
      }
    })
    const invites: Seat[] = (data.invites ?? []).map((i) => ({
      id: i.id,
      name: i.email,
      role: roleLabel(i.role),
      pending: true,
      token: i.token,
    }))
    setSeats(
      members.length || invites.length
        ? [...members, ...invites]
        : [{ id: 'you', name: 'You', role: 'Owner', you: true }],
    )
  }, [backend])

  useEffect(() => {
    if (!ready) return
    if (!backend) {
      setSeats(SEED)
      return
    }
    void loadTeam().catch(() => setSeats([{ id: 'you', name: 'You', role: 'Owner', you: true }]))
  }, [backend, ready, loadTeam])

  if (!canAccess('team')) {
    return <Navigate to="/app" replace />
  }

  async function addSeat() {
    setError(null)
    if (backend) {
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail) {
        setError('Email is required to invite.')
        return
      }
      setBusy(true)
      try {
        const res = await apiFetch<{
          emailSent?: boolean
          emailSkipped?: boolean
          emailError?: string | null
        }>('/api/team/invites', {
          method: 'POST',
          body: JSON.stringify({
            email: trimmedEmail,
            role: role.toLowerCase(),
          }),
        })
        await loadTeam()
        setEmail('')
        setName('')
        if (res.emailSent) {
          setSavedNote(`Invite emailed to ${trimmedEmail}`)
        } else if (res.emailSkipped) {
          setSavedNote('Invite saved — email not configured yet. Copy the invite link.')
        } else {
          setSavedNote(
            res.emailError
              ? `Invite saved, but email failed: ${res.emailError}`
              : 'Invite saved — copy the invite link.',
          )
        }
        setSaved(true)
        window.setTimeout(() => setSaved(false), 4000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invite failed')
      } finally {
        setBusy(false)
      }
      return
    }

    const trimmed = name.trim()
    if (!trimmed) return
    if (seats.length >= seatLimit) {
      setPurchasedSeats(seatLimit + 1)
    }
    setSeats((prev) => [...prev, { id: `${Date.now()}`, name: trimmed, role }])
    setName('')
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const atCap = seats.length >= seatLimit

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6 pb-24 md:px-8">
      <PageHero
        accent="sky"
        title="Team"
        subtitle={`${entitlements.label} · ${seatLimit} seat${seatLimit === 1 ? '' : 's'} licensed · +${formatSeatPrice().replace('/seat', '')} each.`}
      />

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700">
          <Check className="h-4 w-4" /> {backend ? savedNote : 'Seat added'}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200/60 bg-rose-50 px-4 py-2.5 text-[13px] font-semibold text-rose-700">
          {error}
        </div>
      )}

      <Card className="p-5">
        <h3 className="text-[15px] font-bold text-ink">Who’s here</h3>
        <p className="mt-1 text-[13px] text-muted">
          Three simple roles — Owner, Editor, Viewer. No complicated permissions.
        </p>
        <ul className="mt-4 space-y-2">
          {seats.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
            >
              <div>
                <p className="text-[14px] font-semibold text-ink">
                  {s.you ? profile?.ownerName || s.name : s.name}
                  {s.you && <span className="ml-2 text-[11px] font-medium text-muted">(you)</span>}
                  {s.pending && (
                    <span className="ml-2 text-[11px] font-medium text-amber-600">(pending)</span>
                  )}
                </p>
                <p className="text-[12px] text-muted">{s.role}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.pending && s.token && (
                  <button
                    type="button"
                    onClick={() => {
                      const link = `${window.location.origin}/api/team/invites/accept?token=${s.token}`
                      void navigator.clipboard?.writeText(link)
                      setSaved(true)
                      window.setTimeout(() => setSaved(false), 2000)
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white"
                  >
                    Copy invite link
                  </button>
                )}
                <Pill tone="sky">{s.role}</Pill>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-[15px] font-bold text-ink">Invite someone</h3>
        <p className="mb-3 text-[13px] text-muted">
          We’ll email them an accept link. Use their work or personal inbox — they must sign in with
          that same address to join.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {backend ? (
            <label className="block flex-1 text-[12px] font-semibold text-slate-500">
              Work or personal email
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="amina@company.com or amina@gmail.com"
                className="mt-1.5 h-11"
                autoComplete="email"
              />
            </label>
          ) : (
            <label className="block flex-1 text-[12px] font-semibold text-slate-500">
              Name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amina"
                className="mt-1.5 h-11"
              />
            </label>
          )}
          <label className="block text-[12px] font-semibold text-slate-500 sm:w-40">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] outline-none focus:border-sky"
            >
              <option value="Editor">Editor</option>
              <option value="Viewer">Viewer</option>
              <option value="Owner">Owner</option>
            </select>
          </label>
          <Button
            type="button"
            onClick={() => void addSeat()}
            disabled={busy || (backend ? !email.trim() : !name.trim())}
          >
            <UserPlus className="h-4 w-4" />
            {atCap ? `Add (+${formatBdt(SEAT_PRICE_MONTHLY)}/mo)` : backend ? 'Invite' : 'Add'}
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {seats.length} of {seatLimit} seats used
          {atCap ? ` · next invite adds a seat at ${formatBdt(SEAT_PRICE_MONTHLY)}/mo` : ''}
          {backend
            ? ' · invite email comes from Freya (invites@freya.antarious.com).'
            : ' (demo — no real invites sent).'}
        </p>
      </Card>
    </div>
  )
}
