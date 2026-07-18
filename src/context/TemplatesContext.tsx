import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  SEED_TEMPLATES,
  type PostTemplate,
  type TemplateIcon,
} from '../data/templatesData'

const STORAGE_KEY = 'antarious-templates-v1'

function load(): PostTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(SEED_TEMPLATES)
    const parsed = JSON.parse(raw) as PostTemplate[]
    return Array.isArray(parsed) && parsed.length ? parsed : structuredClone(SEED_TEMPLATES)
  } catch {
    return structuredClone(SEED_TEMPLATES)
  }
}

function save(templates: PostTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export interface CreateTemplateInput {
  name: string
  structure: string
  visual: string
  icon?: TemplateIcon
  exampleCaption?: string
  freyaNote?: string
}

interface TemplatesContextValue {
  templates: PostTemplate[]
  selectedId: string | null
  selectTemplate: (id: string | null) => void
  createTemplate: (input: CreateTemplateInput) => PostTemplate
  updateTemplate: (id: string, patch: Partial<PostTemplate>) => void
  removeTemplate: (id: string) => void
  useTemplate: (id: string) => void
  saveFromPost: (caption: string, name?: string) => PostTemplate
  resetDemo: () => void
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null)

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<PostTemplate[]>(() => load())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const persist = useCallback((updater: (prev: PostTemplate[]) => PostTemplate[]) => {
    setTemplates((prev) => {
      const next = updater(prev)
      save(next)
      return next
    })
  }, [])

  const createTemplate = useCallback(
    (input: CreateTemplateInput) => {
      const tpl: PostTemplate = {
        id: `tpl${Date.now()}`,
        name: input.name.trim(),
        structure: input.structure.trim(),
        visual: input.visual.trim(),
        usedCount: 0,
        lastUsed: 'Never',
        icon: input.icon || 'custom',
        exampleCaption: input.exampleCaption?.trim(),
        freyaNote: input.freyaNote?.trim() || 'Custom style — Freya will adapt this next time.',
        createdAt: new Date().toISOString().slice(0, 10),
      }
      persist((prev) => [tpl, ...prev])
      setSelectedId(tpl.id)
      return tpl
    },
    [persist],
  )

  const updateTemplate = useCallback(
    (id: string, patch: Partial<PostTemplate>) => {
      persist((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [persist],
  )

  const removeTemplate = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((t) => t.id !== id))
      setSelectedId((cur) => (cur === id ? null : cur))
    },
    [persist],
  )

  const useTemplate = useCallback(
    (id: string) => {
      persist((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, usedCount: t.usedCount + 1, lastUsed: todayLabel() }
            : t,
        ),
      )
    },
    [persist],
  )

  const saveFromPost = useCallback(
    (caption: string, name?: string) => {
      const short = caption.trim().slice(0, 48)
      return createTemplate({
        name: name || (short ? `From post: ${short}${caption.length > 48 ? '…' : ''}` : 'Saved post style'),
        structure: '[Hook from winning post] + [Proof / detail] + [CTA]',
        visual: 'Match the approved post’s framing and lighting',
        icon: 'custom',
        exampleCaption: caption.trim(),
        freyaNote: 'Saved from a post you approved — Freya will recreate this vibe.',
      })
    },
    [createTemplate],
  )

  const resetDemo = useCallback(() => {
    const fresh = structuredClone(SEED_TEMPLATES)
    save(fresh)
    setTemplates(fresh)
    setSelectedId(null)
  }, [])

  const value = useMemo(
    () => ({
      templates,
      selectedId,
      selectTemplate: setSelectedId,
      createTemplate,
      updateTemplate,
      removeTemplate,
      useTemplate,
      saveFromPost,
      resetDemo,
    }),
    [
      templates,
      selectedId,
      createTemplate,
      updateTemplate,
      removeTemplate,
      useTemplate,
      saveFromPost,
      resetDemo,
    ],
  )

  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
}

export function useTemplates() {
  const ctx = useContext(TemplatesContext)
  if (!ctx) throw new Error('useTemplates must be used within TemplatesProvider')
  return ctx
}
