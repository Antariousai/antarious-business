import { type ReactNode } from 'react'
import { Building2, Calendar, Mail, Phone, User, X } from 'lucide-react'
import { Avatar } from './Avatar'
import { usePipeline } from '../context/PipelineContext'
import {
  DEAL_STAGES,
  forecastValue,
  formatMoney,
  formatShortDate,
  type Deal,
  type DealPriority,
} from '../data/pipelineData'

export function DealDetailPanel({ deal }: { deal: Deal }) {
  const { selectDeal, updateDeal, moveDeal, removeDeal } = usePipeline()
  const meta = DEAL_STAGES.find((s) => s.id === deal.stage)!

  return (
    <aside className="flex h-full w-full max-w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">Deal</div>
          <input
            value={deal.title}
            onChange={(e) => updateDeal(deal.id, { title: e.target.value })}
            className="mt-0.5 w-full border-0 bg-transparent text-[18px] font-bold text-ink outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => selectDeal(null)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-semibold text-muted uppercase">Amount</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[28px] font-bold text-ink">{formatMoney(deal.value)}</span>
            <span className="text-[12px] text-muted">
              Forecast {formatMoney(forecastValue(deal))} ({meta.probability}%)
            </span>
          </div>
          <input
            type="number"
            min={0}
            value={deal.value}
            onChange={(e) => updateDeal(deal.id, { value: Number(e.target.value) || 0 })}
            className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky"
          />
        </div>

        <Field label="Deal stage">
          <div className="flex flex-wrap gap-1.5">
            {DEAL_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => moveDeal(deal.id, s.id)}
                className="rounded-md px-2.5 py-1 text-[11px] font-bold text-white transition"
                style={{
                  background: s.statusColor,
                  opacity: deal.stage === s.id ? 1 : 0.45,
                  outline: deal.stage === s.id ? '2px solid #0f172a33' : undefined,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Associations">
          <div className="space-y-2">
            <AssocRow icon={Building2} label="Company">
              <input
                value={deal.company}
                onChange={(e) => updateDeal(deal.id, { company: e.target.value })}
                className="w-full border-0 bg-transparent text-[13px] font-semibold text-ink outline-none"
              />
            </AssocRow>
            <AssocRow icon={User} label="Contact">
              <input
                value={deal.contact}
                onChange={(e) => updateDeal(deal.id, { contact: e.target.value })}
                className="w-full border-0 bg-transparent text-[13px] font-semibold text-ink outline-none"
              />
            </AssocRow>
            <AssocRow icon={Mail} label="Email">
              <input
                value={deal.email}
                onChange={(e) => updateDeal(deal.id, { email: e.target.value })}
                className="w-full border-0 bg-transparent text-[13px] text-ink outline-none"
                placeholder="Add email"
              />
            </AssocRow>
            <AssocRow icon={Phone} label="Phone">
              <input
                value={deal.phone}
                onChange={(e) => updateDeal(deal.id, { phone: e.target.value })}
                className="w-full border-0 bg-transparent text-[13px] text-ink outline-none"
                placeholder="Add phone"
              />
            </AssocRow>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Close date">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={deal.closeDate}
                onChange={(e) => updateDeal(deal.id, { closeDate: e.target.value })}
                className="w-full border-0 bg-transparent text-[13px] outline-none"
              />
            </div>
          </Field>
          <Field label="Priority">
            <select
              value={deal.priority}
              onChange={(e) => updateDeal(deal.id, { priority: e.target.value as DealPriority })}
              className="h-[38px] w-full rounded-lg border border-slate-200 px-2.5 text-[13px] outline-none"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </Field>
        </div>

        <Field label="Owner">
          <div className="flex items-center gap-2">
            <Avatar letter={deal.owner.charAt(0)} size={28} color={deal.ownerColor} />
            <select
              value={deal.owner}
              onChange={(e) => updateDeal(deal.id, { owner: e.target.value })}
              className="h-9 flex-1 rounded-lg border border-slate-200 px-2.5 text-[13px] outline-none"
            >
              <option value="Joy">Joy</option>
              <option value="Freya">Freya</option>
            </select>
          </div>
        </Field>

        <Field label="Next step">
          <input
            value={deal.nextStep}
            onChange={(e) => updateDeal(deal.id, { nextStep: e.target.value })}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
          />
        </Field>

          <Field label="About this deal">
          <textarea
            value={deal.note}
            onChange={(e) => updateDeal(deal.id, { note: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-sky"
          />
        </Field>

        {'segment' in deal && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Segment">
              <select
                value={(deal as { segment?: string }).segment || 'b2b'}
                onChange={(e) =>
                  updateDeal(deal.id, { segment: e.target.value as 'b2b' | 'b2c' } as never)
                }
                className="h-10 w-full rounded-lg border border-slate-200 px-2.5 text-[13px] outline-none"
              >
                <option value="b2b">B2B</option>
                <option value="b2c">B2C</option>
              </select>
            </Field>
            <Field label="Product">
              <input
                value={(deal as { product?: string }).product || ''}
                onChange={(e) => updateDeal(deal.id, { product: e.target.value } as never)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              />
            </Field>
          </div>
        )}

        <div className="rounded-xl border border-slate-100 px-3 py-3 text-[12px] text-muted">
          <div>
            <span className="font-semibold text-slate-500">Source:</span> {deal.source}
          </div>
          <div className="mt-1">
            <span className="font-semibold text-slate-500">Last activity:</span> {deal.lastActivity}
          </div>
          <div className="mt-1">
            <span className="font-semibold text-slate-500">Created:</span>{' '}
            {formatShortDate(deal.createdAt)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={() => {
            removeDeal(deal.id)
            selectDeal(null)
          }}
          className="rounded-full border border-red-200 px-4 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => selectDeal(null)}
          className="ml-auto rounded-full bg-sky px-5 py-2 text-[12px] font-bold text-white hover:bg-sky-bright"
        >
          Done
        </button>
      </div>
    </aside>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </div>
      {children}
    </div>
  )
}

function AssocRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-2.5 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-slate-400 uppercase">{label}</div>
        {children}
      </div>
    </div>
  )
}
