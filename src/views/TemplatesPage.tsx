import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Heart,
  LayoutTemplate,
  Plus,
  Quote,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import { useTemplates } from '../context/TemplatesContext'
import { useApp } from '../context/AppContext'
import { FreyaCreationAssist } from '../components/FreyaCreationAssist'
import { PageHero } from '../components/PageHero'
import { Button, Modal } from '../components/ui'
import { freyaFillTemplate, type FreyaBizContext } from '../lib/freyaCreationHelpers'
import type { PostTemplate, TemplateIcon } from '../data/templatesData'

const ICON_MAP: Record<TemplateIcon, typeof LayoutTemplate> = {
  spotlight: LayoutTemplate,
  heart: Heart,
  camera: Camera,
  flash: Zap,
  team: UserRound,
  pov: Quote,
  custom: Sparkles,
}

const ICON_TONE: Record<TemplateIcon, string> = {
  spotlight: 'bg-sky-soft text-sky-bright',
  heart: 'bg-rose-50 text-rose-500',
  camera: 'bg-cyan-50 text-cyan-600',
  flash: 'bg-amber-50 text-amber-600',
  team: 'bg-emerald-50 text-emerald-600',
  pov: 'bg-sky-soft text-sky',
  custom: 'bg-sky-soft text-sky-bright',
}

function parseStructure(structure: string): string[] {
  const parts = structure.split(/\s*\+\s*/).map((p) => p.trim()).filter(Boolean)
  return parts.length ? parts : [structure]
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const {
    templates,
    selectedId,
    selectTemplate,
    createTemplate,
    updateTemplate,
    removeTemplate,
    useTemplate,
    resetDemo,
  } = useTemplates()
  const [showNew, setShowNew] = useState(false)
  const [query, setQuery] = useState('')

  const selected = templates.find((t) => t.id === selectedId) || null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.structure.toLowerCase().includes(q) ||
        t.visual.toLowerCase().includes(q),
    )
  }, [templates, query])

  return (
    <div className="px-8 py-6 pb-24">
      <PageHero
        accent="sky"
        title="Your templates"
        subtitle="Save the post styles that work — Freya remixes them so you never start from a blank page."
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowNew(true)}
            className="bg-white text-sky-bright shadow-sm hover:bg-sky-soft"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            New template
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-muted">
          {filtered.length} template{filtered.length === 1 ? '' : 's'}
          {query ? ` matching “${query}”` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => resetDemo()}
            className="rounded-full px-3 py-2 text-[12px] font-semibold text-muted hover:bg-white hover:text-ink"
          >
            Reset demo
          </button>
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or formula…"
              className="h-10 w-64 rounded-full border border-sky/15 bg-white pr-4 pl-10 text-[13px] text-ink shadow-sm outline-none placeholder:text-neutral-400 focus:border-sky/40 focus:ring-2 focus:ring-sky/20"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            active={tpl.id === selectedId}
            onOpen={() => selectTemplate(tpl.id)}
          />
        ))}
      </div>

      {!filtered.length && (
        <div className="mt-2 rounded-2xl border border-dashed border-sky/25 bg-white px-6 py-16 text-center shadow-sm">
          <LayoutTemplate className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
          <p className="text-[15px] font-semibold text-ink">Nothing matches that filter</p>
          <p className="mt-1 text-[13px] text-muted">Try another word, or craft a fresh style.</p>
          <Button type="button" className="mt-4" onClick={() => setShowNew(true)}>
            New template
          </Button>
        </div>
      )}

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-sky/20 bg-sky-soft/40 px-5 py-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky text-white shadow-sm shadow-sky/25">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="text-[13.5px] leading-relaxed text-ink">
          <span className="font-bold text-sky-bright">Tip — </span>
          When a post does well, tap <span className="font-semibold">Save as template</span> in
          Posts and Freya will reuse that style next time.
        </p>
      </div>

      {selected && (
        <TemplateDetail
          key={selected.id}
          template={selected}
          onClose={() => selectTemplate(null)}
          onUse={() => useTemplate(selected.id)}
          onUseWithFreya={() => {
            useTemplate(selected.id)
            navigate('/app/content', {
              state: {
                freyaTemplate: {
                  id: selected.id,
                  caption:
                    selected.exampleCaption ||
                    `${selected.structure}\n\nVisual: ${selected.visual}`,
                },
              },
            })
            selectTemplate(null)
          }}
          onDelete={() => removeTemplate(selected.id)}
          onSave={(patch) => updateTemplate(selected.id, patch)}
        />
      )}

      {showNew && (
        <NewTemplateModal
          onClose={() => setShowNew(false)}
          onCreate={(input) => {
            createTemplate(input)
            setShowNew(false)
          }}
        />
      )}
    </div>
  )
}

function TemplateCard({
  template,
  active,
  onOpen,
}: {
  template: PostTemplate
  active: boolean
  onOpen: () => void
}) {
  const Icon = ICON_MAP[template.icon] || LayoutTemplate
  const tone = ICON_TONE[template.icon] || ICON_TONE.custom
  const parts = parseStructure(template.structure)
  const heat = Math.min(100, Math.round((template.usedCount / 15) * 100))

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-lg shadow-sky/10 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky/20 ${
        active ? 'border-sky ring-2 ring-sky/30' : 'border-sky/15'
      }`}
    >
      <div className="flex items-start gap-3 border-b border-sky/10 px-5 pt-5 pb-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-bold tracking-tight text-ink">{template.name}</h3>
          <p className="mt-0.5 text-[12px] text-muted">
            Used {template.usedCount}x · last {template.lastUsed}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="flex flex-wrap gap-1.5">
          {parts.map((part) => (
            <span
              key={part}
              className="rounded-md bg-sky-soft/70 px-2 py-1 font-mono text-[10.5px] font-semibold text-sky-bright"
            >
              {part}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 text-[12.5px] text-muted">
          <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="leading-snug">{template.visual}</span>
        </div>

        {template.exampleCaption && (
          <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-neutral-600">
            {template.exampleCaption}
          </p>
        )}

        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted">
            <span>Usage</span>
            <span className="font-bold text-sky-bright opacity-0 transition group-hover:opacity-100">
              Open →
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sky-soft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-bright to-sky"
              style={{ width: `${Math.max(8, heat)}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

function TemplateDetail({
  template,
  onClose,
  onUse,
  onUseWithFreya,
  onDelete,
  onSave,
}: {
  template: PostTemplate
  onClose: () => void
  onUse: () => void
  onUseWithFreya: () => void
  onDelete: () => void
  onSave: (patch: Partial<PostTemplate>) => void
}) {
  const Icon = ICON_MAP[template.icon] || LayoutTemplate
  const tone = ICON_TONE[template.icon] || ICON_TONE.custom
  const [name, setName] = useState(template.name)
  const [structure, setStructure] = useState(template.structure)
  const [visual, setVisual] = useState(template.visual)
  const [example, setExample] = useState(template.exampleCaption || '')

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-sky/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wide text-sky-bright uppercase">Template</p>
              <p className="truncate text-[17px] font-bold text-ink">{template.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-none px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted uppercase">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-sky/15 bg-white px-3.5 py-2.5 text-[14px] outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted uppercase">
              Structure
            </span>
            <textarea
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-sky/15 bg-white px-3.5 py-2.5 font-mono text-[13px] outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted uppercase">
              Visual style
            </span>
            <input
              value={visual}
              onChange={(e) => setVisual(e.target.value)}
              className="w-full rounded-xl border border-sky/15 bg-white px-3.5 py-2.5 text-[14px] outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted uppercase">
              Example caption
            </span>
            <textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-sky/15 bg-white px-3.5 py-2.5 text-[14px] leading-relaxed outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/20"
            />
          </label>

          {template.freyaNote && (
            <div className="rounded-xl border border-sky/20 bg-sky-soft/40 px-4 py-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-sky-bright uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Freya
              </div>
              <p className="text-[13px] leading-relaxed text-ink">{template.freyaNote}</p>
            </div>
          )}

          <p className="text-[12px] text-muted">
            Used {template.usedCount}x — last {template.lastUsed}
          </p>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-sky/10 bg-page/80 px-5 py-4">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onSave({
                name: name.trim() || template.name,
                structure: structure.trim() || template.structure,
                visual: visual.trim() || template.visual,
                exampleCaption: example.trim(),
              })
              onClose()
            }}
          >
            Save changes
          </Button>
          <Button type="button" size="sm" onClick={onUseWithFreya}>
            <Sparkles className="h-3.5 w-3.5" />
            Freya, use this
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onUse}>
            Mark used
          </Button>
          <button
            type="button"
            onClick={() => {
              onDelete()
              onClose()
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </footer>
      </aside>
    </div>
  )
}

function NewTemplateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (input: {
    name: string
    structure: string
    visual: string
    exampleCaption?: string
  }) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [leaveToFreya, setLeaveToFreya] = useState(false)
  const [name, setName] = useState('')
  const [structure, setStructure] = useState('[Hook] + [Detail] + [CTA]')
  const [visual, setVisual] = useState('')
  const [example, setExample] = useState('')
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)
  const { profile, prefs } = useApp()
  const bizCtx: FreyaBizContext = {
    businessName: profile?.businessName,
    industry: profile?.industry,
    customers: profile?.customers,
    goals: profile?.goals,
    platforms: profile?.platforms,
    tone: prefs.tone,
  }

  function applySemiAuto() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillTemplate(prompt, bizCtx)
      setName(filled.name)
      setStructure(filled.structure)
      setVisual(filled.visual)
      setExample(filled.exampleCaption)
      setApplying(false)
    }, 550)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setBuilding(true)

    const filled = leaveToFreya ? freyaFillTemplate(prompt, bizCtx) : null
    const templateName = (filled?.name || name).trim()
    const templateStructure = (filled?.structure || structure).trim()
    const templateVisual = (filled?.visual || visual).trim()

    if (!templateName || !templateStructure || !templateVisual) {
      setBuilding(false)
      return
    }

    window.setTimeout(() => {
      onCreate({
        name: templateName,
        structure: templateStructure,
        visual: templateVisual,
        exampleCaption: (filled?.exampleCaption || example).trim() || undefined,
      })
      setBuilding(false)
    }, leaveToFreya ? 600 : 0)
  }

  const canSubmit =
    leaveToFreya || (name.trim().length > 0 && structure.trim().length > 0 && visual.trim().length > 0)
  const busy = applying || building

  return (
    <Modal title="Create template" onClose={onClose} maxWidth="480px">
      <form onSubmit={submit} className="space-y-3.5">
        <FreyaCreationAssist
          prompt={prompt}
          onPromptChange={setPrompt}
          leaveToFreya={leaveToFreya}
          onLeaveToFreyaChange={setLeaveToFreya}
          onApplyPrompt={applySemiAuto}
          applying={applying}
          disabled={busy}
          applyLabel="Freya, design template from prompt"
          placeholder="e.g. Warm weekend tray post — overhead shot, soft CTA"
        />

        {leaveToFreya ? (
          <div className="rounded-xl border border-dashed border-sky/30 bg-sky-soft/40 px-4 py-4 text-center">
            <p className="text-[13px] font-semibold text-ink">Full auto mode</p>
            <p className="mt-1 text-[12px] text-muted">
              Structure, visual style, and example caption from your prompt.
            </p>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-muted">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend tray drop"
                className="w-full rounded-xl border border-sky/15 px-3.5 py-2.5 text-[14px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-muted">Structure formula</span>
              <input
                value={structure}
                onChange={(e) => setStructure(e.target.value)}
                className="w-full rounded-xl border border-sky/15 px-3.5 py-2.5 font-mono text-[13px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-muted">Visual style</span>
              <input
                value={visual}
                onChange={(e) => setVisual(e.target.value)}
                placeholder="e.g. Overhead flat-lay, warm light"
                className="w-full rounded-xl border border-sky/15 px-3.5 py-2.5 text-[14px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-muted">
                Example caption (optional)
              </span>
              <textarea
                value={example}
                onChange={(e) => setExample(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-sky/15 px-3.5 py-2.5 text-[14px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
              />
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || busy}>
            {building ? 'Freya is creating…' : leaveToFreya ? 'Let Freya create it' : 'Create template'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
