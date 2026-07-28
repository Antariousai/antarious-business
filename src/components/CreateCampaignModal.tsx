import { useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { FreyaCreationAssist } from './FreyaCreationAssist'
import { FreyaCampaignReview, type FreyaCampaignSection } from './FreyaCampaignReview'
import { PlatformIcon } from './PlatformIcon'
import { PLATFORM_OPTIONS, type Campaign, type Platform } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { useCampaigns, campaignToFormInput, type NewCampaignInput } from '../context/CampaignsContext'
import { freyaFillCampaign, type FreyaBizContext } from '../lib/freyaCreationHelpers'

const OBJECTIVES = ['Foot traffic', 'Awareness', 'Lead gen', 'Retention', 'Sales']
const TONES = ['Warm, local, inviting', 'Excited & playful', 'Professional & reliable', 'Grateful & friendly']

export function CreateCampaignModal({
  onClose,
  onCreated,
  campaign,
}: {
  onClose: () => void
  onCreated?: (id: string) => void
  /** When set, opens in edit mode for an existing campaign */
  campaign?: Campaign
}) {
  const isEdit = Boolean(campaign)
  const { profile, prefs } = useApp()
  const bizCtx: FreyaBizContext = {
    businessName: profile?.businessName,
    industry: profile?.industry,
    customers: profile?.customers,
    goals: profile?.goals,
    platforms: profile?.platforms?.length ? profile.platforms : prefs.connectedPlatforms,
    tone: prefs.tone,
  }
  const initial = campaign ? campaignToFormInput(campaign) : null
  const { createCampaign, updateCampaign, launch } = useCampaigns()
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [prompt, setPrompt] = useState('')
  const [leaveToFreya, setLeaveToFreya] = useState(false)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [goal, setGoal] = useState(initial?.goal ?? '')
  const [audience, setAudience] = useState(initial?.audience ?? '')
  const [budget, setBudget] = useState(initial?.budget ?? '200')
  const [platforms, setPlatforms] = useState<Platform[]>(
    initial?.platforms ??
      (bizCtx.platforms?.length ? bizCtx.platforms.slice(0, 2) : ['Instagram', 'Facebook']),
  )
  const [objective, setObjective] = useState(initial?.objective ?? 'Foot traffic')
  const [tone, setTone] = useState(initial?.tone ?? TONES[0])
  const [freyaDrafted, setFreyaDrafted] = useState(false)
  const [showManualEditor, setShowManualEditor] = useState(isEdit)
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

  function togglePlatform(p: Platform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  function runFreyaFill() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillCampaign(prompt, bizCtx)
      setTitle(filled.title)
      setGoal(filled.goal)
      setAudience(filled.audience)
      setBudget(filled.budget)
      setObjective(filled.objective)
      setTone(filled.tone)
      setPlatforms(filled.platforms)
      setFreyaDrafted(true)
      setShowManualEditor(false)
      setApplying(false)
    }, 550)
  }

  function handleLeaveToFreyaChange(value: boolean) {
    setLeaveToFreya(value)
    if (value) {
      setShowManualEditor(false)
      if (prompt.trim()) runFreyaFill()
    } else {
      setShowManualEditor(true)
    }
  }

  function openEditor(section: FreyaCampaignSection) {
    setShowManualEditor(true)
    window.setTimeout(() => {
      const key = section === 'all' ? 'title' : section
      sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  function buildInput(): NewCampaignInput {
    return {
      title,
      goal,
      audience,
      platforms,
      budget,
      objective,
      tone,
    }
  }

  function handleSave(e?: FormEvent) {
    e?.preventDefault()

    if (!isEdit && leaveToFreya && !freyaDrafted && prompt.trim()) {
      runFreyaFill()
      return
    }

    if (isEdit && leaveToFreya && !freyaDrafted && prompt.trim()) {
      runFreyaFill()
      return
    }

    const input = buildInput()
    if (!input.title.trim() || !input.platforms.length) {
      return
    }

    setBuilding(true)
    window.setTimeout(() => {
      void (async () => {
        try {
          if (isEdit && campaign) {
            await Promise.resolve(updateCampaign(campaign.id, input))
          } else {
            const created = await Promise.resolve(createCampaign(input))
            onCreated?.(created.id)
          }
          onClose()
        } finally {
          setBuilding(false)
        }
      })()
    }, 700)
  }

  function handleRepublish(e?: FormEvent) {
    e?.preventDefault()

    if (leaveToFreya && !freyaDrafted && prompt.trim()) {
      runFreyaFill()
      return
    }

    const input = buildInput()
    if (!input.title.trim() || !input.platforms.length) {
      return
    }

    setBuilding(true)
    window.setTimeout(() => {
      void (async () => {
        try {
          if (isEdit && campaign) {
            await Promise.resolve(updateCampaign(campaign.id, input, { republish: true }))
          } else {
            const created = await Promise.resolve(createCampaign(input))
            launch(created.id)
            onCreated?.(created.id)
          }
          onClose()
        } finally {
          setBuilding(false)
        }
      })()
    }, 700)
  }

  const busy = applying || building
  const fullAutoReady = !leaveToFreya || freyaDrafted
  const canSave = title.trim().length > 0 && platforms.length > 0 && fullAutoReady
  const isLiveCampaign =
    isEdit && campaign && ['running', 'paused', 'done'].includes(campaign.status)
  const relaunchLabel =
    campaign?.status === 'draft' ? 'Launch campaign' : 'Republish campaign'
  const showReview = leaveToFreya && freyaDrafted && !showManualEditor
  const showManualFields = !leaveToFreya || showManualEditor

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">{isEdit ? 'Edit campaign' : 'New campaign'}</h2>
            <p className="text-[12px] text-muted">
              {isEdit
                ? 'Edit anytime — save changes or republish live. Freya can re-draft too.'
                : 'Freya drafts the campaign — you review & edit before creating'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 px-6 py-5">
          <FreyaCreationAssist
            prompt={prompt}
            onPromptChange={setPrompt}
            leaveToFreya={leaveToFreya}
            onLeaveToFreyaChange={handleLeaveToFreyaChange}
            onApplyPrompt={runFreyaFill}
            applying={applying}
            disabled={busy}
            applyLabel={
              isEdit
                ? leaveToFreya
                  ? 'Freya, re-draft campaign from prompt'
                  : 'Freya, update campaign from prompt'
                : leaveToFreya
                  ? 'Freya, draft campaign from prompt'
                  : 'Freya, fill campaign from prompt'
            }
            placeholder={
              isEdit
                ? 'e.g. Shift toward wholesale buyers — Facebook + Messenger, clearer B2B offer'
                : 'e.g. Get more weekend customers for our new offer on Instagram & Facebook'
            }
          />

          {leaveToFreya && !freyaDrafted && !applying && (
            <p className="rounded-xl border border-dashed border-sky/30 bg-sky-soft/30 px-4 py-3 text-[12px] text-muted">
              {isEdit
                ? 'Tap the arrow — Freya will re-draft from your prompt for review before republishing.'
                : 'Add a prompt and tap the arrow — Freya will draft your campaign for review. Manual fields stay hidden until she\'s done.'}
            </p>
          )}

          {showReview && (
            <FreyaCampaignReview
              title={title}
              goal={goal}
              audience={audience}
              platforms={platforms}
              objective={objective}
              budget={budget}
              tone={tone}
              onEdit={openEditor}
              onRegenerate={runFreyaFill}
              regenerating={applying}
            />
          )}

          {showManualFields && (
            <>
              {leaveToFreya && freyaDrafted && (
                <button
                  type="button"
                  onClick={() => setShowManualEditor(false)}
                  className="text-[12px] font-semibold text-sky hover:underline"
                >
                  ← Back to Freya&apos;s draft review
                </button>
              )}

              <div ref={(el) => { sectionRefs.current.title = el }}>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink">Campaign name</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Spring Bloom Sale"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              </div>

              <div ref={(el) => { sectionRefs.current.goal = el }}>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink">Goal</label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={2}
                  placeholder="What do you want this campaign to achieve?"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              </div>

              <div ref={(el) => { sectionRefs.current.audience = el }}>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink">Audience</label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Who should see this?"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              </div>

              <div ref={(el) => { sectionRefs.current.platforms = el }}>
                <label className="mb-2 block text-[13px] font-semibold text-ink">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => {
                    const on = platforms.includes(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold ${
                          on
                            ? 'border-sky bg-sky-soft text-sky-bright'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <PlatformIcon platform={p} size={15} />
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div ref={(el) => { sectionRefs.current.objective = el }}>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Objective</label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky"
                  >
                    {OBJECTIVES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div ref={(el) => { sectionRefs.current.budget = el }}>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink">Budget ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                  />
                </div>
              </div>

              <div ref={(el) => { sectionRefs.current.tone = el }}>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave || busy}
              className="rounded-full border border-sky/40 bg-white px-5 py-2.5 text-[13px] font-bold text-sky hover:bg-sky-soft disabled:border-slate-200 disabled:text-slate-400"
            >
              {building ? 'Saving…' : isEdit ? 'Save changes' : 'Save as draft'}
            </button>
            <button
              type="button"
              onClick={() => handleRepublish()}
              disabled={!canSave || busy}
              className="rounded-full bg-sky px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sky-bright disabled:bg-sky-muted"
            >
              {building
                ? isEdit && (isLiveCampaign || campaign?.status === 'draft')
                  ? 'Republishing…'
                  : 'Launching…'
                : isEdit
                  ? relaunchLabel
                  : 'Create & launch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
