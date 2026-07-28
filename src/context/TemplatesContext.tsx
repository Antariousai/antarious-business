import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  SEED_TEMPLATES,
  type PostTemplate,
  type TemplateIcon,
} from '../data/templatesData'
import { apiFetch } from '@/lib/backend/api'
import { mapApiTemplate } from '@/lib/backend/mappers'
import { useBackendMode } from '@/lib/backend/BackendModeContext'

const STORAGE_KEY = 'antarious-templates-v2-bd'

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
  createTemplate: (input: CreateTemplateInput) => PostTemplate | Promise<PostTemplate>
  updateTemplate: (id: string, patch: Partial<PostTemplate>) => void | Promise<void>
  removeTemplate: (id: string) => void | Promise<void>
  useTemplate: (id: string) => void
  saveFromPost: (caption: string, name?: string) => PostTemplate | Promise<PostTemplate>
  resetDemo: () => void
  refresh: () => Promise<void>
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null)

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const { backend, ready } = useBackendMode()
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!backend) return
    const data = await apiFetch<{ templates: Parameters<typeof mapApiTemplate>[0][] }>(
      '/api/templates',
    )
    setTemplates((data.templates ?? []).map(mapApiTemplate))
  }, [backend])

  useEffect(() => {
    if (!ready) return
    if (!backend) {
      setTemplates(load())
      return
    }
    let cancelled = false
    void refresh().catch(() => {
      if (!cancelled) setTemplates([])
    })
    return () => {
      cancelled = true
    }
  }, [backend, ready, refresh])

  const persist = useCallback((updater: (prev: PostTemplate[]) => PostTemplate[]) => {
    setTemplates((prev) => {
      const next = updater(prev)
      save(next)
      return next
    })
  }, [])

  const createTemplate = useCallback(
    async (input: CreateTemplateInput) => {
      if (backend) {
        const caption = input.exampleCaption?.trim() || input.structure.trim()
        const data = await apiFetch<{ template: Parameters<typeof mapApiTemplate>[0] }>(
          '/api/templates',
          {
            method: 'POST',
            body: JSON.stringify({
              name: input.name.trim(),
              caption,
              tag: input.visual.trim() || null,
              platforms: [],
            }),
          },
        )
        const tpl = mapApiTemplate(data.template)
        setTemplates((prev) => [tpl, ...prev])
        setSelectedId(tpl.id)
        return tpl
      }

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
    [backend, persist],
  )

  const updateTemplate = useCallback(
    async (id: string, patch: Partial<PostTemplate>) => {
      if (backend) {
        await apiFetch('/api/templates', {
          method: 'PATCH',
          body: JSON.stringify({
            id,
            name: patch.name,
            caption: patch.exampleCaption ?? patch.structure,
            tag: patch.visual,
          }),
        })
        await refresh()
        return
      }
      persist((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [backend, persist, refresh],
  )

  const removeTemplate = useCallback(
    async (id: string) => {
      if (backend) {
        await apiFetch(`/api/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
        setTemplates((prev) => prev.filter((t) => t.id !== id))
        setSelectedId((cur) => (cur === id ? null : cur))
        return
      }
      persist((prev) => prev.filter((t) => t.id !== id))
      setSelectedId((cur) => (cur === id ? null : cur))
    },
    [backend, persist],
  )

  const useTemplate = useCallback(
    (id: string) => {
      persist((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, usedCount: t.usedCount + 1, lastUsed: todayLabel() } : t,
        ),
      )
    },
    [persist],
  )

  const saveFromPost = useCallback(
    async (caption: string, name?: string) => {
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
    if (backend) {
      void refresh()
      return
    }
    const fresh = structuredClone(SEED_TEMPLATES)
    save(fresh)
    setTemplates(fresh)
    setSelectedId(null)
  }, [backend, refresh])

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
      refresh,
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
      refresh,
    ],
  )

  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
}

export function useTemplates() {
  const ctx = useContext(TemplatesContext)
  if (!ctx) throw new Error('useTemplates must be used within TemplatesProvider')
  return ctx
}
