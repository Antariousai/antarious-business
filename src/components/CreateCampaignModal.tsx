import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { FreyaArtifactReview } from './FreyaArtifactReview'
import { FreyaCreationAssist } from './FreyaCreationAssist'
import { PlatformIcon } from './PlatformIcon'
import { type Campaign, type Platform } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { useCampaigns, campaignToFormInput, type NewCampaignInput } from '../context/CampaignsContext'
import { useFreyaActivity } from '../context/FreyaActivityContext'
import { buildRevisePrompt } from '@/lib/freyaAskHandoff'
import { freyaFillCampaign, type FreyaBizContext } from '../lib/freyaCreationHelpers'

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
  const { askFreya } = useFreyaActivity()
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
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [goal, setGoal] = useState(initial?.goal ?? '')
  const [audience, setAudience] = useState(initial?.audience ?? '')
  const [budget, setBudget] = useState(initial?.budget ?? '200')
  const [platforms, setPlatforms] = useState<Platform[]>(
    initial?.platforms ??
      (bizCtx.platforms?.length ? bizCtx.platforms.slice(0, 2) : ['Instagram', 'Facebook']),
  )
  const [objective, setObjective] = useState(initial?.objective ?? 'Foot traffic')
  const [tone, setTone] = useState(initial?.tone ?? 'Warm, local, inviting')
  const [freyaDrafted, setFreyaDrafted] = useState(isEdit)
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

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
      setApplying(false)
    }, 550)
  }

  function handoff(section?: string) {
    askFreya({
      prompt: buildRevisePrompt({
        kind: 'campaign',
        section,
        tone: prefs.tone,
        fields: {
          Title: title,
          Goal: goal,
          Audience: audience,
          Platforms: platforms.join(', '),
          Objective: objective,
          Budget: `$${budget}`,
          Tone: tone,
        },
      }),
    })
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

    if (!freyaDrafted && prompt.trim()) {
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

    if (!freyaDrafted && prompt.trim()) {
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
  const canSave = title.trim().length > 0 && platforms.length > 0 && freyaDrafted
  const isLiveCampaign =
    isEdit && campaign && ['running', 'paused', 'done'].includes(campaign.status)
  const relaunchLabel =
    campaign?.status === 'draft' ? 'Launch campaign' : 'Republish campaign'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">{isEdit ? 'Edit campaign' : 'New campaign'}</h2>
            <p className="text-[12px] text-muted">
              {isEdit
                ? 'Review Freya&apos;s draft — use Ask Freya to change anything in chat.'
                : 'Freya drafts the campaign — you review before saving or launching'}
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
            onApplyPrompt={runFreyaFill}
            applying={applying}
            disabled={busy}
            applyLabel={
              isEdit ? 'Freya, re-draft campaign from prompt' : 'Freya, draft campaign from prompt'
            }
            placeholder={
              isEdit
                ? 'e.g. Shift toward wholesale buyers — Facebook + Messenger, clearer B2B offer'
                : 'e.g. Get more weekend customers for our new offer on Instagram & Facebook'
            }
          />

          {!freyaDrafted && !applying && (
            <p className="rounded-xl border border-dashed border-sky/30 bg-sky-soft/30 px-4 py-3 text-[12px] text-muted">
              {isEdit
                ? 'Add a prompt and tap the arrow to re-draft, or save as-is. Use Ask Freya on the review card to tweak fields.'
                : 'Add a prompt and tap the arrow — Freya will draft your campaign for review.'}
            </p>
          )}

          {freyaDrafted && (
            <FreyaArtifactReview
              title={isEdit ? "Freya's draft (current campaign)" : "Freya's draft"}
              fields={[
                { key: 'title', label: 'Campaign name', value: title },
                { key: 'goal', label: 'Goal', value: goal },
                { key: 'audience', label: 'Audience', value: audience },
                {
                  key: 'platforms',
                  label: 'Platforms',
                  value: platforms.join(', '),
                  children: (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {platforms.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 rounded-full bg-sky-soft px-2 py-0.5 text-[12px] font-semibold text-sky-bright"
                        >
                          <PlatformIcon platform={p} size={13} />
                          {p}
                        </span>
                      ))}
                    </div>
                  ),
                },
                { key: 'objective', label: 'Objective', value: objective },
                { key: 'budget', label: 'Budget', value: `$${budget}` },
                { key: 'tone', label: 'Tone', value: tone },
              ]}
              onAskFreya={() => handoff()}
              onAskFreyaField={(_key, label) => handoff(label.toLowerCase())}
              onRegenerate={runFreyaFill}
              regenerating={applying}
            />
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
