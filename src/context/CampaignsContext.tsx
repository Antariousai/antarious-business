import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  CAMPAIGNS as SEED,
  DEMO_IMAGES,
  ICON_COLORS,
  type Campaign,
  type Platform,
} from '../data/mockData'

const STORAGE_KEY = 'antarious-campaigns-v1'

function loadCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(SEED)
    const parsed = JSON.parse(raw) as Campaign[]
    return Array.isArray(parsed) && parsed.length ? parsed : structuredClone(SEED)
  } catch {
    return structuredClone(SEED)
  }
}

function saveCampaigns(campaigns: Campaign[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
}

export interface NewCampaignInput {
  title: string
  goal: string
  audience: string
  platforms: Platform[]
  budget: string
  objective: string
  tone: string
}

export function parseCampaignBudget(budget?: string): string {
  if (!budget) return '200'
  const match = budget.match(/\$?(\d+)/)
  return match?.[1] ?? '200'
}

const CAMPAIGN_OBJECTIVES = ['Foot traffic', 'Awareness', 'Lead gen', 'Retention', 'Sales']
const CAMPAIGN_TONES = ['Warm, local, inviting', 'Excited & playful', 'Professional & reliable', 'Grateful & friendly']

export function campaignToFormInput(campaign: Campaign): NewCampaignInput {
  const platforms = (campaign.platforms?.length
    ? campaign.platforms
    : ['Instagram']) as Platform[]
  const objective = campaign.setup?.objective ?? 'Foot traffic'
  const tone = campaign.setup?.tone ?? 'Warm, local, inviting'
  return {
    title: campaign.title,
    goal: campaign.goal ?? campaign.description ?? '',
    audience: campaign.audience ?? campaign.setup?.audience ?? '',
    platforms,
    budget: parseCampaignBudget(campaign.budget),
    objective: CAMPAIGN_OBJECTIVES.includes(objective) ? objective : 'Foot traffic',
    tone: CAMPAIGN_TONES.includes(tone) ? tone : 'Warm, local, inviting',
  }
}

interface CampaignsContextValue {
  campaigns: Campaign[]
  getCampaign: (id: string) => Campaign | undefined
  setStatus: (id: string, status: Campaign['status']) => void
  pause: (id: string) => void
  resume: (id: string) => void
  launch: (id: string) => void
  createCampaign: (input: NewCampaignInput) => Campaign
  updateCampaign: (id: string, input: NewCampaignInput, options?: { republish?: boolean }) => Campaign | undefined
  resetCampaigns: () => void
}

const CampaignsContext = createContext<CampaignsContextValue | null>(null)

export function CampaignsProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns)

  const persist = useCallback((next: Campaign[]) => {
    setCampaigns(next)
    saveCampaigns(next)
  }, [])

  const getCampaign = useCallback(
    (id: string) => campaigns.find((c) => c.id === id),
    [campaigns],
  )

  const setStatus = useCallback(
    (id: string, status: Campaign['status']) => {
      persist(
        campaigns.map((c) => {
          if (c.id !== id) return c
          const summary =
            status === 'running'
              ? `Live now — Freya is running ${c.title}. Check back for results.`
              : status === 'paused'
                ? `Paused — resume anytime to keep ${c.title} going.`
                : status === 'draft'
                  ? `Draft ready — Freya built the plan. Launch when you approve.`
                  : c.summary
          return { ...c, status, summary }
        }),
      )
    },
    [campaigns, persist],
  )

  const pause = useCallback((id: string) => setStatus(id, 'paused'), [setStatus])
  const resume = useCallback((id: string) => setStatus(id, 'running'), [setStatus])
  const launch = useCallback((id: string) => setStatus(id, 'running'), [setStatus])

  const createCampaign = useCallback(
    (input: NewCampaignInput) => {
      const id = `c${Date.now()}`
      const platforms = input.platforms.length ? input.platforms : (['Instagram'] as Platform[])
      const budgetLabel = input.budget.startsWith('$') ? input.budget : `$${input.budget || '100'}`
      const campaign: Campaign = {
        id,
        title: input.title.trim() || 'Untitled campaign',
        description: input.goal.trim() || 'New Freya-built campaign',
        summary: 'Draft ready — Freya built the audience and creative. Launch when you approve.',
        status: 'draft',
        iconColor: ICON_COLORS[campaigns.length % ICON_COLORS.length],
        reach: 0,
        clicks: 0,
        leads: 0,
        goal: input.goal.trim(),
        audience: input.audience.trim(),
        platforms,
        budget: budgetLabel,
        reachProgress: 0,
        report: `Freya drafted "${input.title.trim()}" for you. Review the setup below, then tap Launch when you're ready.`,
        engagementInsight: 'No live data yet — launch to start tracking engagement.',
        interactions30d: 0,
        bestDay: '—',
        vsPrior7d: 0,
        engagement: [
          { label: 'Day 1', value: 0 },
          { label: 'Day 2', value: 0 },
          { label: 'Day 3', value: 0 },
          { label: 'Day 4', value: 0 },
        ],
        setup: {
          objective: input.objective || 'Awareness',
          platform: platforms.includes('LinkedIn') && platforms.length === 1 ? 'LinkedIn' : 'Meta',
          format: 'Single image + carousel',
          audience: input.audience.trim() || 'Your ideal customers nearby',
          schedule: 'Daily 8-10am',
          budget: `Organic boosted ${budgetLabel}`,
          tone: input.tone || 'Warm, local, inviting',
        },
        posts: [
          {
            id: `${id}-p1`,
            image: DEMO_IMAGES[campaigns.length % DEMO_IMAGES.length],
            caption: `${input.title.trim()} — Freya drafted this caption for your first post...`,
          },
        ],
      }
      persist([campaign, ...campaigns])
      return campaign
    },
    [campaigns, persist],
  )

  const updateCampaign = useCallback(
    (id: string, input: NewCampaignInput, options?: { republish?: boolean }): Campaign | undefined => {
      const platforms = input.platforms.length ? input.platforms : (['Instagram'] as Platform[])
      const budgetLabel = input.budget.startsWith('$') ? input.budget : `$${input.budget || '100'}`
      const republish = options?.republish ?? false
      let updated: Campaign | undefined

      const next = campaigns.map((c) => {
        if (c.id !== id) return c
        const title = input.title.trim() || c.title
        updated = {
          ...c,
          title,
          description: input.goal.trim() || c.description,
          goal: input.goal.trim(),
          audience: input.audience.trim(),
          platforms,
          budget: budgetLabel,
          status: republish ? 'running' : c.status,
          summary: republish
            ? `Live again — Freya republished ${title} with your latest updates.`
            : c.summary,
          report: republish
            ? `Republished ${new Date().toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} — your edits are now live across ${platforms.join(', ')}.`
            : c.report,
          setup: c.setup
            ? {
                ...c.setup,
                objective: input.objective || c.setup.objective,
                platform:
                  platforms.includes('LinkedIn') && platforms.length === 1 ? 'LinkedIn' : 'Meta',
                audience: input.audience.trim() || c.setup.audience,
                budget: `Organic boosted ${budgetLabel}`,
                tone: input.tone || c.setup.tone,
              }
            : c.setup,
        }
        return updated
      })

      if (!updated) return undefined
      persist(next)
      return updated
    },
    [campaigns, persist],
  )

  const resetCampaigns = useCallback(() => {
    const seed = structuredClone(SEED)
    persist(seed)
  }, [persist])

  const value = useMemo(
    () => ({
      campaigns,
      getCampaign,
      setStatus,
      pause,
      resume,
      launch,
      createCampaign,
      updateCampaign,
      resetCampaigns,
    }),
    [campaigns, getCampaign, setStatus, pause, resume, launch, createCampaign, updateCampaign, resetCampaigns],
  )

  return <CampaignsContext.Provider value={value}>{children}</CampaignsContext.Provider>
}

export function useCampaigns() {
  const ctx = useContext(CampaignsContext)
  if (!ctx) throw new Error('useCampaigns must be used within CampaignsProvider')
  return ctx
}
