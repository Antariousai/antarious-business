import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { FreyaArtifactReview } from './FreyaArtifactReview'
import { FreyaCreationAssist } from './FreyaCreationAssist'
import { useApp } from '../context/AppContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { useLeads } from '../context/LeadsContext'
import { useFunnelStages } from '../context/FunnelStagesContext'
import { buildRevisePrompt } from '@/lib/freyaAskHandoff'
import { freyaFillLead, type FreyaBizContext } from '../lib/freyaCreationHelpers'
import type { Lead, LeadPlatform, LeadSource, LeadTemp } from '../data/leadsData'

const QUICK_TAGS = ['Bridal', 'Events', 'Corporate', 'Photoshoot', 'Custom Order', 'Wholesale', 'Local', 'Repeat']

export function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { addLead } = useLeads()
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
  const [name, setName] = useState('')
  const email = ''
  const [company, setCompany] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>(['Local'])
  const [freyaDrafted, setFreyaDrafted] = useState(false)
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

  function runFreyaFill() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillLead(prompt, bizCtx)
      setName(filled.name)
      setCompany(filled.company)
      setNote(filled.note)
      setTags(filled.tags)
      setFreyaDrafted(true)
      setApplying(false)
    }, 550)
  }

  function handoff(section?: string) {
    askFreya({
      prompt: buildRevisePrompt({
        kind: 'lead',
        section,
        tone: prefs.tone,
        fields: {
          Name: name,
          Email: email,
          Company: company,
          Note: note,
          Tags: tags.join(', '),
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

    const leadName = name.trim()
    if (!leadName || !freyaDrafted) {
      return
    }

    setBuilding(true)
    window.setTimeout(() => {
      addLead({
        name: leadName,
        email: email.trim() || `${leadName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        company: company.trim() || '—',
        note: note.trim() || 'New lead added via Freya',
        tags: tags.length ? tags : ['Local'],
        temp: 'warm',
      })
      setBuilding(false)
      onClose()
    }, 400)
  }

  const canSubmit = freyaDrafted && name.trim().length > 0
  const busy = applying || building

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">Add person</h2>
            <p className="text-[12px] text-muted">Describe who they are — Freya drafts the details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
          >
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
            applyLabel="Freya, draft person from prompt"
            placeholder="e.g. Bridal inquiry from Instagram — wants a custom lehenga for September"
          />

          {!freyaDrafted && !applying && (
            <p className="rounded-xl border border-dashed border-sky/30 bg-sky-soft/30 px-4 py-3 text-[12px] text-muted">
              Add a prompt and tap the arrow — Freya will draft the person for review.
            </p>
          )}

          {freyaDrafted && (
            <FreyaArtifactReview
              fields={[
                { key: 'name', label: 'Full name', value: name },
                { key: 'email', label: 'Email', value: email },
                { key: 'company', label: 'Company', value: company },
                { key: 'note', label: 'About', value: note },
                { key: 'tags', label: 'Tags', value: tags.join(', ') },
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
            className="flex h-12 w-full items-center justify-center rounded-full bg-sky text-[14px] font-bold text-white hover:bg-sky-bright disabled:bg-sky-muted"
          >
            {building ? 'Freya is on it…' : 'Add person & let Freya draft a hello'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function EditLeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { updateLead, removeLeads } = useLeads()
  const { leadStages } = useFunnelStages()
  const [name, setName] = useState(lead.name)
  const [email, setEmail] = useState(lead.email)
  const [company, setCompany] = useState(lead.company === '—' ? '' : lead.company)
  const [note, setNote] = useState(lead.note)
  const [tags, setTags] = useState<string[]>([...lead.tags])
  const [temp, setTemp] = useState<LeadTemp>(lead.temp)
  const [source, setSource] = useState<LeadSource>(lead.source)
  const [platform, setPlatform] = useState<LeadPlatform>(lead.platform)
  const [stage, setStage] = useState(lead.stage)

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    updateLead(lead.id, {
      name: name.trim(),
      email: email.trim() || lead.email,
      company: company.trim() || '—',
      note: note.trim() || lead.note,
      tags: tags.length ? tags : ['Local'],
      temp,
      source,
      platform,
      stage,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">Edit person</h2>
            <p className="text-[12px] text-muted">Update details Freya uses for outreach</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">Company</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink">Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as Lead['stage'])}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              >
                {leadStages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink">Temperature</label>
              <select
                value={temp}
                onChange={(e) => setTemp(e.target.value as LeadTemp)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              >
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              >
                <option value="campaign">Campaign</option>
                <option value="freya-found">Freya found</option>
                <option value="manual">Manual</option>
                <option value="inbox">Messages</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as LeadPlatform)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-semibold text-ink">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => {
                const on = tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      on
                        ? 'bg-gradient-to-r from-sky-bright to-sky text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remove ${lead.name}?`)) {
                  removeLeads([lead.id])
                  onClose()
                }
              }}
              className="h-11 rounded-full border border-coral/30 bg-coral/10 px-4 text-[13px] font-bold text-coral hover:bg-coral/15 sm:mr-auto"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-full border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="h-11 flex-1 rounded-full bg-gradient-to-r from-sky-bright to-sky-bright px-5 text-[14px] font-bold text-white shadow-sm shadow-sky/30 hover:brightness-110 disabled:opacity-50 sm:flex-none sm:min-w-[140px]"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
