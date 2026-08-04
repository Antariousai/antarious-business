import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'

/** Compact “Add step” control for kanban boards. */
export function AddFunnelStep({
  onAdd,
  placeholder = 'New step name',
}: {
  onAdd: (label: string) => Promise<unknown> | unknown
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const trimmed = label.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onAdd(trimmed)
      setLabel('')
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-[220px] min-w-[200px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-sky/35 bg-white/70 px-4 py-8 text-[13px] font-bold text-sky-bright transition hover:border-sky hover:bg-sky-soft/50"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Add step
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-[260px] min-w-[240px] shrink-0 flex-col gap-2 rounded-2xl border border-sky/25 bg-white p-3 shadow-sm"
    >
      <div className="text-[12px] font-bold text-ink">New funnel step</div>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={placeholder}
        disabled={busy}
        className="h-10 rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!label.trim() || busy}
          className="flex-1 rounded-xl bg-sky px-3 py-2 text-[12px] font-bold text-white hover:bg-sky-bright disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setLabel('')
          }}
          className="rounded-xl px-3 py-2 text-[12px] font-semibold text-slate-500 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
