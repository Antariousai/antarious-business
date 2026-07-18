import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { FreyaCreationAssist } from './FreyaCreationAssist'
import { usePipeline } from '../context/PipelineContext'
import { DEAL_STAGES, type DealPriority, type DealStage } from '../data/pipelineData'
import type { CrmSegment } from '../data/crmData'
import { freyaFillDeal } from '../lib/freyaCreationHelpers'

export function AddDealModal({
  onClose,
  defaultStage = 'qualified',
}: {
  onClose: () => void
  defaultStage?: DealStage
}) {
  const { addDeal } = usePipeline()
  const [prompt, setPrompt] = useState('')
  const [leaveToFreya, setLeaveToFreya] = useState(false)
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [value, setValue] = useState('1000')
  const [stage, setStage] = useState<DealStage>(defaultStage)
  const [priority, setPriority] = useState<DealPriority>('medium')
  const [segment, setSegment] = useState<CrmSegment>('b2b')
  const [product, setProduct] = useState('Custom')
  const [owner, setOwner] = useState('Joy')
  const [closeDate, setCloseDate] = useState(
    () => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  )
  const [nextStep, setNextStep] = useState('Send intro email')
  const [note, setNote] = useState('')
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

  function applySemiAuto() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillDeal(prompt, segment)
      setTitle(filled.title)
      setCompany(filled.company)
      setContact(filled.contact)
      setValue(filled.value)
      setProduct(filled.product)
      setNextStep(filled.nextStep)
      setNote(filled.note)
      setOwner(filled.owner)
      setApplying(false)
    }, 550)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBuilding(true)

    const filled = leaveToFreya ? freyaFillDeal(prompt, segment) : null
    const dealTitle = (filled?.title || title).trim()
    if (!dealTitle) {
      setBuilding(false)
      return
    }

    window.setTimeout(() => {
      addDeal({
        title: dealTitle,
        company: filled?.company ?? company,
        contact: filled?.contact ?? contact,
        email: filled?.email ?? email,
        value: Number(filled?.value ?? value) || 0,
        stage,
        priority,
        segment,
        product: filled?.product ?? product,
        owner: filled?.owner ?? owner,
        closeDate,
        nextStep: filled?.nextStep ?? nextStep,
        note: filled?.note ?? note,
      })
      setBuilding(false)
      onClose()
    }, leaveToFreya ? 600 : 0)
  }

  const canSubmit = leaveToFreya || title.trim().length > 0
  const busy = applying || building

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">Create deal</h2>
            <p className="text-[12px] text-muted">Describe the opportunity — or let Freya set it up</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <FreyaCreationAssist
            prompt={prompt}
            onPromptChange={setPrompt}
            leaveToFreya={leaveToFreya}
            onLeaveToFreyaChange={setLeaveToFreya}
            onApplyPrompt={applySemiAuto}
            applying={applying}
            disabled={busy}
            applyLabel="Freya, fill deal from prompt"
            placeholder="e.g. Corporate catering for 40 people next month — $2k budget"
          />

          {leaveToFreya ? (
            <div className="rounded-xl border border-dashed border-sky/30 bg-sky-soft/40 px-4 py-4 text-center">
              <p className="text-[13px] font-semibold text-ink">Full auto mode</p>
              <p className="mt-1 text-[12px] text-muted">Freya creates the deal with value, steps, and owner.</p>
            </div>
          ) : (
            <>
              <div className="inline-flex rounded-md border border-slate-200 p-0.5">
                {(['b2b', 'b2c'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSegment(s)}
                    className={`rounded px-3 py-1.5 text-[12px] font-bold uppercase ${
                      segment === s ? 'bg-slate-900 text-white' : 'text-slate-500'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink">Deal name *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required={!leaveToFreya}
                  autoFocus
                  placeholder={segment === 'b2c' ? 'e.g. Birthday cake for Maya' : 'e.g. Wedding cake package'}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">
                    {segment === 'b2b' ? 'Company' : 'Customer / —'}
                  </label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-sky"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Contact</label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-sky"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-sky"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-sky"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Product</label>
                  <input
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-sky"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as DealStage)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as DealPriority)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Owner</label>
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none"
                  >
                    <option value="Joy">Joy</option>
                    <option value="Freya">Freya</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Close date</label>
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink">Next step</label>
                <input
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-sky"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink">Notes</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#ff7a59] text-[14px] font-bold text-white hover:bg-[#f15b3a] disabled:opacity-50"
          >
            {building ? 'Freya is on it…' : leaveToFreya ? 'Let Freya create deal' : 'Create deal'}
          </button>
        </form>
      </div>
    </div>
  )
}
