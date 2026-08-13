import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { FreyaArtifactReview } from './FreyaArtifactReview'
import { FreyaCreationAssist } from './FreyaCreationAssist'
import { useApp } from '../context/AppContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { usePipeline } from '../context/PipelineContext'
import { useFunnelStages } from '../context/FunnelStagesContext'
import { type DealPriority, type DealStage } from '../data/pipelineData'
import type { CrmSegment } from '../data/crmData'
import { buildRevisePrompt } from '@/lib/freyaAskHandoff'
import { freyaFillDeal, type FreyaBizContext } from '../lib/freyaCreationHelpers'

export function AddDealModal({
  onClose,
  defaultStage = 'qualified',
}: {
  onClose: () => void
  defaultStage?: DealStage
}) {
  const { addDeal } = usePipeline()
  const { crmStages } = useFunnelStages()
  const { profile, prefs } = useApp()
  const { askFreya } = useFreyaActivity()
  const bizCtx: FreyaBizContext = {
    businessName: profile?.businessName,
    industry: profile?.industry,
    customers: profile?.customers,
    goals: profile?.goals,
    platforms: profile?.platforms,
    tone: prefs.tone,
  }
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const email = ''
  const [value, setValue] = useState('1000')
  const stage = defaultStage
  const priority: DealPriority = 'medium'
  const segment: CrmSegment = 'b2b'
  const [product, setProduct] = useState('Custom')
  const [owner, setOwner] = useState(profile?.ownerName || 'You')
  const closeDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const [nextStep, setNextStep] = useState('Send intro email')
  const [note, setNote] = useState('')
  const [freyaDrafted, setFreyaDrafted] = useState(false)
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

  function runFreyaFill() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillDeal(prompt, segment, bizCtx)
      setTitle(filled.title)
      setCompany(filled.company)
      setContact(filled.contact)
      setValue(filled.value)
      setProduct(filled.product)
      setNextStep(filled.nextStep)
      setNote(filled.note)
      setOwner(filled.owner)
      setFreyaDrafted(true)
      setApplying(false)
    }, 550)
  }

  function handoff(section?: string) {
    const stageLabel = crmStages.find((s) => s.key === stage)?.label || stage
    askFreya({
      prompt: buildRevisePrompt({
        kind: 'deal',
        section,
        tone: prefs.tone,
        fields: {
          'Deal name': title,
          Segment: segment.toUpperCase(),
          Company: company,
          Contact: contact,
          Email: email,
          Amount: `$${value}`,
          Product: product,
          Stage: stageLabel,
          Priority: priority,
          Owner: owner,
          'Close date': closeDate,
          'Next step': nextStep,
          Notes: note,
        },
      }),
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()

    if (!freyaDrafted && prompt.trim()) {
      runFreyaFill()
      return
    }

    const dealTitle = title.trim()
    if (!dealTitle || !freyaDrafted) {
      return
    }

    setBuilding(true)
    window.setTimeout(() => {
      addDeal({
        title: dealTitle,
        company,
        contact,
        email,
        value: Number(value) || 0,
        stage,
        priority,
        segment,
        product,
        owner,
        closeDate,
        nextStep,
        note,
      })
      setBuilding(false)
      onClose()
    }, 400)
  }

  const canSubmit = freyaDrafted && title.trim().length > 0
  const busy = applying || building

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">Create deal</h2>
            <p className="text-[12px] text-muted">Describe the opportunity — Freya drafts the deal</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <FreyaCreationAssist
            prompt={prompt}
            onPromptChange={setPrompt}
            onApplyPrompt={runFreyaFill}
            applying={applying}
            disabled={busy}
            applyLabel="Freya, draft deal from prompt"
            placeholder="e.g. Wholesale kurtis for 40 pieces next month — ৳48,000 budget"
          />

          {!freyaDrafted && !applying && (
            <p className="rounded-xl border border-dashed border-sky/30 bg-sky-soft/30 px-4 py-3 text-[12px] text-muted">
              Add a prompt and tap the arrow — Freya will draft the deal for review.
            </p>
          )}

          {freyaDrafted && (
            <FreyaArtifactReview
              fields={[
                { key: 'title', label: 'Deal name', value: title },
                { key: 'segment', label: 'Segment', value: segment.toUpperCase() },
                { key: 'company', label: 'Company', value: company },
                { key: 'contact', label: 'Contact', value: contact },
                { key: 'value', label: 'Amount', value: `$${value}` },
                { key: 'product', label: 'Product', value: product },
                {
                  key: 'stage',
                  label: 'Stage',
                  value: crmStages.find((s) => s.key === stage)?.label || stage,
                },
                { key: 'priority', label: 'Priority', value: priority },
                { key: 'owner', label: 'Owner', value: owner },
                { key: 'closeDate', label: 'Close date', value: closeDate },
                { key: 'nextStep', label: 'Next step', value: nextStep },
                { key: 'note', label: 'Notes', value: note },
              ]}
              onAskFreya={() => handoff()}
              onAskFreyaField={(_key, label) => handoff(label.toLowerCase())}
              onRegenerate={runFreyaFill}
              regenerating={applying}
            />
          )}

          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#ff7a59] text-[14px] font-bold text-white hover:bg-[#f15b3a] disabled:opacity-50"
          >
            {building ? 'Freya is on it…' : 'Create deal'}
          </button>
        </form>
      </div>
    </div>
  )
}
