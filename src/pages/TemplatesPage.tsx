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
import { FreyaCreationAssist } from '../components/FreyaCreationAssist'
import { freyaFillTemplate } from '../lib/freyaCreationHelpers'
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

/** Saturated accent washes — readable color, not pastel fog */
const ACCENT: Record<
  TemplateIcon,
  { wash: string; chip: string; ink: string; preview: string; bar: string; ring: string }
> = {
  spotlight: {
    wash: 'from-sky-200/90 via-sky-50 to-white',
    chip: 'bg-sky-200/80 text-sky-900',
    ink: 'text-sky-bright',
    preview: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 42%, #0369a1 100%)',
    bar: 'from-sky-bright to-cyan-500',
    ring: 'ring-sky/25',
  },
  heart: {
    wash: 'from-rose-200/90 via-rose-50 to-white',
    chip: 'bg-rose-200/80 text-rose-900',
    ink: 'text-rose-600',
    preview: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 45%, #be123c 100%)',
    bar: 'from-rose-500 to-coral',
    ring: 'ring-rose/25',
  },
  camera: {
    wash: 'from-cyan-200/80 via-sky-50 to-white',
    chip: 'bg-cyan-100 text-cyan-900',
    ink: 'text-cyan-700',
    preview: 'linear-gradient(145deg, #22d3ee 0%, #0ea5e9 40%, #075985 100%)',
    bar: 'from-cyan-500 to-sky-bright',
    ring: 'ring-cyan/25',
  },
  flash: {
    wash: 'from-amber-200/90 via-orange-50 to-white',
    chip: 'bg-amber-200/80 text-amber-950',
    ink: 'text-amber-600',
    preview: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #ea580c 100%)',
    bar: 'from-sunshine to-orange-500',
    ring: 'ring-amber/30',
  },
  team: {
    wash: 'from-emerald-200/90 via-mint/30 to-white',
    chip: 'bg-emerald-200/80 text-emerald-950',
    ink: 'text-emerald-600',
    preview: 'linear-gradient(135deg, #34d399 0%, #10b981 40%, #047857 100%)',
    bar: 'from-mint to-emerald-600',
    ring: 'ring-emerald/25',
  },
  pov: {
    wash: 'from-indigo-200/80 via-sky-50 to-white',
    chip: 'bg-indigo-100 text-indigo-900',
    ink: 'text-indigo-600',
    preview: 'linear-gradient(160deg, #818cf8 0%, #6366f1 40%, #4338ca 100%)',
    bar: 'from-indigo-500 to-sky-bright',
    ring: 'ring-indigo/25',
  },
  custom: {
    wash: 'from-sky-200 via-sky-soft to-white',
    chip: 'bg-sky-soft text-sky-bright',
    ink: 'text-sky',
    preview: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #0f1724 100%)',
    bar: 'from-sky to-navy',
    ring: 'ring-sky/30',
  },
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
  const totalUses = templates.reduce((s, t) => s + t.usedCount, 0)

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
    <div className="tpl-page relative min-h-full overflow-hidden">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 -right-20 h-80 w-80 rounded-full bg-sky/25 blur-3xl" />
        <div className="absolute top-40 -left-16 h-64 w-64 rounded-full bg-sunshine/20 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-coral/15 blur-3xl" />
        <div className="absolute right-1/3 bottom-0 h-48 w-48 rounded-full bg-mint/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(15,23,36,0.06) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <div className="relative px-6 pt-5 pb-10 md:px-8">
        {/* Intro band */}
        <section className="tpl-fade-in mb-8 overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/75 shadow-[0_20px_50px_-28px_rgba(15,23,36,0.35)] backdrop-blur-md ring-1 ring-sky/10">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="relative px-6 py-6 md:px-8 md:py-7">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy-deep px-3 py-1 text-[11px] font-bold tracking-wide text-sky uppercase">
                <Sparkles className="h-3 w-3" />
                Freya&apos;s recipe shelf
              </div>
              <h2 className="max-w-lg text-[28px] leading-[1.15] font-bold tracking-tight text-ink md:text-[32px]">
                Winning post styles,{' '}
                <span className="bg-gradient-to-r from-sky-bright to-[#0ea5e9] bg-clip-text text-transparent">
                  ready to remix
                </span>
              </h2>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-muted">
                Save the formulas that work. Freya reuses them so every post feels like you —
                without starting from a blank page.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNew(true)}
                  className="tpl-cta inline-flex items-center gap-2 rounded-full bg-sky px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(56,189,248,0.7)] transition hover:bg-sky-bright hover:shadow-[0_14px_28px_-8px_rgba(56,189,248,0.85)]"
                >
                  <Plus className="h-4 w-4" strokeWidth={3} />
                  New template
                </button>
                <button
                  type="button"
                  onClick={() => resetDemo()}
                  className="rounded-full px-4 py-2.5 text-[12px] font-semibold text-slate-500 transition hover:bg-white/80 hover:text-ink"
                >
                  Reset demo
                </button>
              </div>
            </div>

            <div className="relative flex flex-col justify-center gap-5 overflow-hidden border-t border-sky/10 bg-gradient-to-br from-[#071525] via-[#0c4a6e] to-[#0ea5e9] px-6 py-7 text-white md:rounded-tr-[1.75rem] md:rounded-br-[1.75rem] md:border-t-0 md:border-l md:border-white/10 lg:px-7">
              <div className="pointer-events-none absolute -top-10 -right-6 h-40 w-40 rounded-full bg-sunshine/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-8 left-0 h-36 w-36 rounded-full bg-coral/35 blur-3xl" />
              <div className="pointer-events-none absolute top-1/2 left-1/3 h-24 w-24 -translate-y-1/2 rounded-full bg-mint/25 blur-2xl" />
              <div className="relative grid grid-cols-3 gap-2.5 sm:gap-3">
                <Stat label="Styles" value={String(templates.length)} />
                <Stat label="Times used" value={String(totalUses)} />
                <Stat label="This week" value="4" />
              </div>
              <p className="relative text-center text-[12.5px] leading-relaxed text-sky-100/90">
                Tip: approve a hit in Content, hit{' '}
                <span className="font-semibold text-sunshine">Save as template</span>, and Freya
                learns that vibe for next time.
              </p>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-slate-500">
            {filtered.length} template{filtered.length === 1 ? '' : 's'}
            {query ? ` matching “${query}”` : ''}
          </p>
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or formula…"
              className="h-11 w-64 rounded-full border-0 bg-white/90 pr-4 pl-10 text-[13px] text-ink shadow-sm outline-none ring-1 ring-slate-200/80 backdrop-blur placeholder:text-slate-400 focus:ring-2 focus:ring-sky/35"
            />
          </label>
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tpl, i) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              active={tpl.id === selectedId}
              index={i}
              onOpen={() => selectTemplate(tpl.id)}
            />
          ))}
        </div>

        {!filtered.length && (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300/80 bg-white/60 px-6 py-16 text-center backdrop-blur">
            <LayoutTemplate className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-[15px] font-semibold text-ink">Nothing matches that filter</p>
            <p className="mt-1 text-[13px] text-muted">Try another word, or craft a fresh style.</p>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="mt-4 rounded-full bg-sky px-4 py-2 text-[13px] font-bold text-white"
            >
              New template
            </button>
          </div>
        )}

        {/* Pro tip */}
        <div className="tpl-tip mt-8 flex items-start gap-3 rounded-[1.25rem] border border-sky/30 bg-gradient-to-r from-sky-100 via-amber-50 to-rose-50 px-5 py-4 shadow-[0_12px_30px_-18px_rgba(14,165,233,0.45)]">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-bright to-cyan-600 text-white shadow-md shadow-sky/40">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-[13.5px] leading-relaxed text-ink">
            <span className="font-bold text-sky-bright">Pro tip — </span>
            When you approve a post that does really well, tap{' '}
            <span className="font-semibold">Save as template</span> in Content and Freya will
            recreate that style next time you&apos;re out of ideas.
          </p>
        </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white/12 px-2 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-white/25 backdrop-blur-md sm:px-3 sm:py-4">
      <div className="text-[26px] leading-none font-extrabold tracking-tight text-sunshine sm:text-[28px]">
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-bold tracking-[0.08em] text-sky-100/85 uppercase">
        {label}
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  active,
  index,
  onOpen,
}: {
  template: PostTemplate
  active: boolean
  index: number
  onOpen: () => void
}) {
  const Icon = ICON_MAP[template.icon] || LayoutTemplate
  const accent = ACCENT[template.icon] || ACCENT.custom
  const parts = parseStructure(template.structure)
  const heat = Math.min(100, Math.round((template.usedCount / 15) * 100))

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ animationDelay: `${index * 55}ms` }}
      className={`tpl-card group relative flex flex-col overflow-hidden rounded-[1.5rem] border bg-gradient-to-b text-left transition duration-300 ${accent.wash} ${
        active
          ? `border-sky shadow-[0_18px_40px_-18px_rgba(56,189,248,0.55)] ring-2 ring-sky/40`
          : `border-white/90 shadow-[0_14px_36px_-22px_rgba(15,23,36,0.35)] ring-1 ${accent.ring} hover:-translate-y-1 hover:border-sky/40 hover:shadow-[0_22px_44px_-20px_rgba(15,23,36,0.4)]`
      }`}
    >
      {/* Visual preview strip */}
      <div className="relative mx-4 mt-4 h-[96px] overflow-hidden rounded-2xl shadow-inner">
        <div className="absolute inset-0" style={{ background: accent.preview }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.45),transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/10" />
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(255,255,255,0.18) 11px, rgba(255,255,255,0.18) 12px)',
          }}
        />
        <div className="absolute right-3 bottom-3 left-3 rounded-xl bg-black/25 px-3 py-2 backdrop-blur-md ring-1 ring-white/30">
          <p className="line-clamp-2 text-[11px] leading-snug font-medium text-white">
            {template.exampleCaption || template.structure}
          </p>
        </div>
        <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-ink shadow-md transition duration-300 group-hover:scale-105">
          <Icon className={`h-4 w-4 ${accent.ink}`} />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <h3 className="text-[16px] font-bold tracking-tight text-ink">{template.name}</h3>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {parts.map((part) => (
            <span
              key={part}
              className={`rounded-md px-2 py-1 font-mono text-[10.5px] font-semibold ${accent.chip}`}
            >
              {part}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 text-[12.5px] text-muted">
          <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="leading-snug">{template.visual}</span>
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>
              Used {template.usedCount}x — last {template.lastUsed}
            </span>
            <span className="font-bold text-sky-bright opacity-0 transition group-hover:opacity-100">
              Open →
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${accent.bar} transition-all duration-500`}
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
  const accent = ACCENT[template.icon] || ACCENT.custom
  const [name, setName] = useState(template.name)
  const [structure, setStructure] = useState(template.structure)
  const [visual, setVisual] = useState(template.visual)
  const [example, setExample] = useState(template.exampleCaption || '')

  return (
    <div className="tpl-overlay fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <aside
        className="tpl-drawer flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-36 shrink-0 overflow-hidden">
          <div className="absolute inset-0" style={{ background: accent.preview }} />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm backdrop-blur hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 left-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md">
              <Icon className={`h-5 w-5 ${accent.ink}`} />
            </span>
            <div>
              <p className="text-[11px] font-bold tracking-wide text-white/80 uppercase drop-shadow">
                Template
              </p>
              <p className="text-[18px] font-bold text-ink">{template.name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-slate-400 uppercase">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] outline-none transition focus:border-sky focus:bg-white focus:ring-2 focus:ring-sky/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-slate-400 uppercase">
              Structure
            </span>
            <textarea
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 font-mono text-[13px] outline-none transition focus:border-sky focus:bg-white focus:ring-2 focus:ring-sky/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-slate-400 uppercase">
              Visual style
            </span>
            <input
              value={visual}
              onChange={(e) => setVisual(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] outline-none transition focus:border-sky focus:bg-white focus:ring-2 focus:ring-sky/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-slate-400 uppercase">
              Example caption
            </span>
            <textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] leading-relaxed outline-none transition focus:border-sky focus:bg-white focus:ring-2 focus:ring-sky/20"
            />
          </label>

          {template.freyaNote && (
            <div className="rounded-2xl bg-gradient-to-br from-sky-soft to-white px-4 py-3 ring-1 ring-sky/20">
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

        <footer className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onSave({
                name: name.trim() || template.name,
                structure: structure.trim() || template.structure,
                visual: visual.trim() || template.visual,
                exampleCaption: example.trim(),
              })
              onClose()
            }}
            className="rounded-full bg-navy-mid px-4 py-2.5 text-[13px] font-bold text-white"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={onUseWithFreya}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sky-bright"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Freya, use this
          </button>
          <button
            type="button"
            onClick={onUse}
            className="rounded-full border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-600"
          >
            Mark used
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete()
              onClose()
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50"
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

  function applySemiAuto() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillTemplate(prompt)
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

    const filled = leaveToFreya ? freyaFillTemplate(prompt) : null
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
    <div className="tpl-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="tpl-modal max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl"
      >
        <div className="relative bg-gradient-to-br from-navy-deep to-[#1a2a3d] px-6 py-5 text-white">
          <div className="absolute -top-8 -right-6 h-28 w-28 rounded-full bg-sky/25 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wide text-sky uppercase">New style</p>
              <h3 className="text-[20px] font-bold">Create template</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-3.5 px-6 py-5">
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
              <p className="mt-1 text-[12px] text-muted">Structure, visual style, and example caption from your prompt.</p>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-slate-500">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekend tray drop"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[14px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-slate-500">Structure formula</span>
                <input
                  value={structure}
                  onChange={(e) => setStructure(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-[13px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-slate-500">Visual style</span>
                <input
                  value={visual}
                  onChange={(e) => setVisual(e.target.value)}
                  placeholder="e.g. Overhead flat-lay, warm light"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[14px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-slate-500">
                  Example caption (optional)
                </span>
                <textarea
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-[14px] outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              </label>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-slate-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="rounded-full bg-sky px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-sky/25 hover:bg-sky-bright disabled:bg-sky-muted disabled:shadow-none"
          >
            {building ? 'Freya is creating…' : leaveToFreya ? 'Let Freya create it' : 'Create template'}
          </button>
        </div>
      </form>
    </div>
  )
}
