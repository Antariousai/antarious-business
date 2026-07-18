import { useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { PageHero } from '../components/PageHero'
import { useApp } from '../context/AppContext'
import { Navigate } from 'react-router-dom'
import { SEAT_PRICE_MONTHLY } from '../data/planTiers'

type Role = 'Owner' | 'Editor' | 'Viewer'

type Seat = { id: string; name: string; role: Role; you?: boolean }

const SEED: Seat[] = [
  { id: '1', name: 'You', role: 'Owner', you: true },
  { id: '2', name: 'Ana', role: 'Editor' },
  { id: '3', name: 'Sam', role: 'Viewer' },
]

/** Scale-only team stub — seats billed separately from the plan base. */
export function TeamPage() {
  const { canAccess, entitlements, profile, seatLimit, setPurchasedSeats } = useApp()
  const [seats, setSeats] = useState<Seat[]>(SEED)
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('Editor')
  const [saved, setSaved] = useState(false)

  if (!canAccess('team')) {
    return <Navigate to="/app" replace />
  }

  function addSeat() {
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
        accent="violet"
        title="Team"
        subtitle={`${entitlements.label} · ${seatLimit} seat${seatLimit === 1 ? '' : 's'} licensed · +$${SEAT_PRICE_MONTHLY}/mo each.`}
      />

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700">
          <Check className="h-4 w-4" /> Seat added
        </div>
      )}

      <section className="page-card rounded-2xl p-5">
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
                </p>
                <p className="text-[12px] text-muted">{s.role}</p>
              </div>
              <span className="rounded-full bg-sky-soft px-2.5 py-1 text-[11px] font-bold text-sky">
                {s.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="page-card rounded-2xl p-5">
        <h3 className="mb-3 text-[15px] font-bold text-ink">Invite someone</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-[12px] font-semibold text-slate-500">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ana"
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[14px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </label>
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
          <button
            type="button"
            onClick={addSeat}
            disabled={!name.trim()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-sky px-5 text-[13px] font-bold text-white hover:bg-sky-bright disabled:bg-sky-muted"
          >
            <UserPlus className="h-4 w-4" />
            {atCap ? `Add (+$${SEAT_PRICE_MONTHLY}/mo)` : 'Add'}
          </button>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {seats.length} of {seatLimit} seats used
          {atCap ? ` · next invite adds a seat at $${SEAT_PRICE_MONTHLY}/mo` : ''} (demo — no real
          invites sent).
        </p>
      </section>
    </div>
  )
}
