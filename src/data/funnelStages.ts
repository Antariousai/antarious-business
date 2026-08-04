/** Org-custom funnel steps — Interested people (leads) + Customers (crm). */

export type FunnelKind = 'leads' | 'crm'

export type FunnelStage = {
  /** Row id (uuid) when backed by API; equals key in demo mode. */
  id: string
  key: string
  label: string
  position: number
  color: string
  probability?: number
  isClosed?: boolean
  isDefault?: boolean
}

export const STAGE_COLORS = [
  '#38bdf8',
  '#f97316',
  '#14b8a6',
  '#a78bfa',
  '#fb7185',
  '#fdab3d',
  '#22c55e',
  '#579bfc',
  '#ff642e',
  '#94a3b8',
]

export const DEFAULT_LEAD_STAGES: FunnelStage[] = [
  { id: 'new', key: 'new', label: 'New', position: 0, color: '#38bdf8', isDefault: true },
  { id: 'contacted', key: 'contacted', label: 'Contacted', position: 1, color: '#f97316' },
  { id: 'qualified', key: 'qualified', label: 'Qualified', position: 2, color: '#14b8a6' },
  { id: 'converted', key: 'converted', label: 'Converted', position: 3, color: '#22c55e' },
]

export const DEFAULT_CRM_STAGES: FunnelStage[] = [
  {
    id: 'qualified',
    key: 'qualified',
    label: 'New',
    position: 0,
    color: '#579bfc',
    probability: 20,
    isDefault: true,
  },
  { id: 'meeting', key: 'meeting', label: 'Talking', position: 1, color: '#38bdf8', probability: 40 },
  {
    id: 'proposal',
    key: 'proposal',
    label: 'Quote sent',
    position: 2,
    color: '#fdab3d',
    probability: 60,
  },
  {
    id: 'negotiation',
    key: 'negotiation',
    label: 'Almost there',
    position: 3,
    color: '#ff642e',
    probability: 80,
  },
  {
    id: 'won',
    key: 'won',
    label: 'Won',
    position: 4,
    color: '#00c875',
    probability: 100,
    isClosed: true,
  },
  {
    id: 'lost',
    key: 'lost',
    label: 'Lost',
    position: 5,
    color: '#c4c4c4',
    probability: 0,
    isClosed: true,
  },
]

export function slugStageKey(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return base || `stage_${Date.now().toString(36)}`
}

export function nextStageColor(existing: FunnelStage[]): string {
  return STAGE_COLORS[existing.length % STAGE_COLORS.length]
}

export function sortStages(stages: FunnelStage[]): FunnelStage[] {
  return [...stages].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
}

export function defaultStageKey(stages: FunnelStage[], fallback: string): string {
  return stages.find((s) => s.isDefault)?.key ?? stages[0]?.key ?? fallback
}

/** Soft column chrome for kanban — keyed by index so custom stages don’t need a code map. */
export function stageColumnChrome(index: number): {
  bg: string
  over: string
  header: string
  count: string
} {
  const palettes = [
    {
      bg: 'bg-gradient-to-b from-sky-soft/90 via-sky-soft/40 to-white/60',
      over: 'ring-2 ring-sky shadow-lg shadow-sky/20',
      header: 'from-sky-bright/15 to-transparent',
      count: 'bg-sky text-white shadow-sm shadow-sky/30',
    },
    {
      bg: 'bg-gradient-to-b from-peach/40 via-amber-50/50 to-white/60',
      over: 'ring-2 ring-sunshine shadow-lg shadow-amber-200/40',
      header: 'from-sunshine/20 to-transparent',
      count: 'bg-sunshine text-navy-deep shadow-sm',
    },
    {
      bg: 'bg-gradient-to-b from-sky-soft/70 via-sky-soft/30 to-white/60',
      over: 'ring-2 ring-sky/25 shadow-lg shadow-sky/40',
      header: 'from-sky/15 to-transparent',
      count: 'bg-sky-bright text-white shadow-sm',
    },
    {
      bg: 'bg-gradient-to-b from-mint/25 via-emerald-50/40 to-white/60',
      over: 'ring-2 ring-mint shadow-lg shadow-emerald-200/40',
      header: 'from-mint/20 to-transparent',
      count: 'bg-mint text-white shadow-sm',
    },
    {
      bg: 'bg-gradient-to-b from-violet-50 via-fuchsia-50/40 to-white/60',
      over: 'ring-2 ring-violet-300 shadow-lg shadow-violet-200/40',
      header: 'from-violet-200/40 to-transparent',
      count: 'bg-violet-500 text-white shadow-sm',
    },
  ]
  return palettes[index % palettes.length]
}
