import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { BusinessProfile, GoalId, Platform } from '../data/mockData'
import {
  aiCreditBalance,
  canAccessModule,
  canAccessPath,
  getAiCreditPack,
  getEntitlements,
  INCLUDED_OWNER_SEATS,
  type AiCreditPackId,
  type AppModule,
  type PlanTier,
  type PlanEntitlements,
} from '../data/planTiers'
import { clearAntariousStorage } from '../lib/clearAntariousStorage'

/** Keep in sync with STEPS in FreyaTour.tsx */
const FREYA_TOUR_LENGTH = 3

const STORAGE_KEY = 'antarious-demo-v2'

export type FreyaTone = 'warm' | 'professional' | 'playful'

export interface FreyaPrefs {
  tone: FreyaTone
  autoApprove: boolean
  connectedPlatforms: Platform[]
  tourCompleted: boolean
  tourActive: boolean
  tourStep: number
}

/** Demo billing — seats & Freya AI credits (not real charges). */
export interface BillingDemo {
  /** Total seats licensed (includes owner). */
  purchasedSeats: number
  aiCreditsUsed: number
  aiCreditsPurchased: number
}

const DEFAULT_PREFS: FreyaPrefs = {
  tone: 'warm',
  autoApprove: false,
  connectedPlatforms: [],
  tourCompleted: false,
  tourActive: false,
  tourStep: 0,
}

const DEFAULT_BILLING: BillingDemo = {
  purchasedSeats: 3,
  aiCreditsUsed: 180,
  aiCreditsPurchased: 0,
}

interface StoredState {
  profile: BusinessProfile | null
  onboarded: boolean
  prefs: FreyaPrefs
  billing: BillingDemo
}

function normalizeProfile(profile: BusinessProfile | null): BusinessProfile | null {
  if (!profile) return null
  return {
    ...profile,
    planTier: profile.planTier ?? 'starter',
  }
}

function normalizeBilling(billing?: Partial<BillingDemo> | null): BillingDemo {
  return {
    purchasedSeats: Math.max(
      INCLUDED_OWNER_SEATS,
      billing?.purchasedSeats ?? DEFAULT_BILLING.purchasedSeats,
    ),
    aiCreditsUsed: Math.max(0, billing?.aiCreditsUsed ?? DEFAULT_BILLING.aiCreditsUsed),
    aiCreditsPurchased: Math.max(
      0,
      billing?.aiCreditsPurchased ?? DEFAULT_BILLING.aiCreditsPurchased,
    ),
  }
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('antarious-demo-v1')
    if (!raw) {
      return {
        profile: null,
        onboarded: false,
        prefs: { ...DEFAULT_PREFS },
        billing: { ...DEFAULT_BILLING },
      }
    }
    const parsed = JSON.parse(raw) as Partial<StoredState> & { profile?: BusinessProfile | null }
    return {
      profile: normalizeProfile(parsed.profile ?? null),
      onboarded: Boolean(parsed.onboarded),
      prefs: { ...DEFAULT_PREFS, ...(parsed.prefs || {}) },
      billing: normalizeBilling(parsed.billing),
    }
  } catch {
    return {
      profile: null,
      onboarded: false,
      prefs: { ...DEFAULT_PREFS },
      billing: { ...DEFAULT_BILLING },
    }
  }
}

function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

interface AppContextValue {
  profile: BusinessProfile | null
  onboarded: boolean
  prefs: FreyaPrefs
  billing: BillingDemo
  planTier: PlanTier
  entitlements: PlanEntitlements
  seatLimit: number
  aiCreditsRemaining: number
  canAccess: (module: AppModule) => boolean
  canAccessRoute: (pathname: string) => boolean
  setPlanTier: (tier: PlanTier) => void
  setPurchasedSeats: (count: number) => void
  spendAiCredits: (amount?: number) => boolean
  buyAiCreditPack: (packId: AiCreditPackId) => void
  resetAiCreditsDemo: () => void
  login: (name: string) => void
  completeOnboarding: (data: Omit<BusinessProfile, 'ownerName'>) => void
  logout: () => void
  updateGoals: (goals: GoalId[]) => void
  updatePlatforms: (platforms: Platform[]) => void
  updateProfile: (patch: Partial<BusinessProfile>) => void
  updatePrefs: (patch: Partial<FreyaPrefs>) => void
  connectPlatform: (platform: Platform) => void
  disconnectPlatform: (platform: Platform) => void
  startTour: () => void
  nextTourStep: () => void
  endTour: (completed?: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = loadState()
  const [profile, setProfile] = useState<BusinessProfile | null>(initial.profile)
  const [onboarded, setOnboarded] = useState(initial.onboarded)
  const [prefs, setPrefs] = useState<FreyaPrefs>(initial.prefs)
  const [billing, setBilling] = useState<BillingDemo>(initial.billing)

  const planTier: PlanTier = profile?.planTier ?? 'starter'
  const entitlements = getEntitlements(planTier)
  const seatLimit = billing.purchasedSeats
  const aiCreditsRemaining = aiCreditBalance(
    planTier,
    billing.aiCreditsPurchased,
    billing.aiCreditsUsed,
  )

  const persist = useCallback((next: StoredState) => {
    const normalized = {
      ...next,
      profile: normalizeProfile(next.profile),
      billing: normalizeBilling(next.billing),
    }
    setProfile(normalized.profile)
    setOnboarded(normalized.onboarded)
    setPrefs(normalized.prefs)
    setBilling(normalized.billing)
    saveState(normalized)
  }, [])

  const login = useCallback(
    (name: string) => {
      persist({
        profile: {
          ownerName: name.trim() || 'Joy',
          businessName: '',
          industry: '',
          customers: '',
          goals: [],
          platforms: [],
          planTier: 'starter',
        },
        onboarded: false,
        prefs: { ...DEFAULT_PREFS },
        billing: { ...DEFAULT_BILLING },
      })
    },
    [persist],
  )

  const completeOnboarding = useCallback(
    (data: Omit<BusinessProfile, 'ownerName'>) => {
      const ownerName = profile?.ownerName || 'Joy'
      persist({
        profile: {
          ownerName,
          ...data,
          planTier: data.planTier ?? 'starter',
        },
        onboarded: true,
        prefs: {
          ...prefs,
          connectedPlatforms: [],
          tourCompleted: false,
          tourActive: true,
          tourStep: 0,
        },
        billing,
      })
    },
    [persist, profile?.ownerName, prefs, billing],
  )

  const logout = useCallback(() => {
    clearAntariousStorage()
    setProfile(null)
    setOnboarded(false)
    setPrefs({ ...DEFAULT_PREFS })
    setBilling({ ...DEFAULT_BILLING })
    window.location.assign('/')
  }, [])

  const updateGoals = useCallback(
    (goals: GoalId[]) => {
      if (!profile) return
      persist({ profile: { ...profile, goals }, onboarded, prefs, billing })
    },
    [persist, profile, onboarded, prefs, billing],
  )

  const updatePlatforms = useCallback(
    (platforms: Platform[]) => {
      if (!profile) return
      persist({ profile: { ...profile, platforms }, onboarded, prefs, billing })
    },
    [persist, profile, onboarded, prefs, billing],
  )

  const updateProfile = useCallback(
    (patch: Partial<BusinessProfile>) => {
      if (!profile) return
      persist({ profile: { ...profile, ...patch }, onboarded, prefs, billing })
    },
    [persist, profile, onboarded, prefs, billing],
  )

  const setPlanTier = useCallback(
    (tier: PlanTier) => {
      if (!profile) return
      persist({ profile: { ...profile, planTier: tier }, onboarded, prefs, billing })
    },
    [persist, profile, onboarded, prefs, billing],
  )

  const setPurchasedSeats = useCallback(
    (count: number) => {
      persist({
        profile,
        onboarded,
        prefs,
        billing: {
          ...billing,
          purchasedSeats: Math.max(INCLUDED_OWNER_SEATS, Math.floor(count)),
        },
      })
    },
    [persist, profile, onboarded, prefs, billing],
  )

  const spendAiCredits = useCallback(
    (amount = 1) => {
      const need = Math.max(1, Math.floor(amount))
      const remaining = aiCreditBalance(
        planTier,
        billing.aiCreditsPurchased,
        billing.aiCreditsUsed,
      )
      if (remaining < need) return false
      persist({
        profile,
        onboarded,
        prefs,
        billing: { ...billing, aiCreditsUsed: billing.aiCreditsUsed + need },
      })
      return true
    },
    [persist, profile, onboarded, prefs, billing, planTier],
  )

  const buyAiCreditPack = useCallback(
    (packId: AiCreditPackId) => {
      const pack = getAiCreditPack(packId)
      if (!pack) return
      persist({
        profile,
        onboarded,
        prefs,
        billing: {
          ...billing,
          aiCreditsPurchased: billing.aiCreditsPurchased + pack.credits,
        },
      })
    },
    [persist, profile, onboarded, prefs, billing],
  )

  const resetAiCreditsDemo = useCallback(() => {
    persist({
      profile,
      onboarded,
      prefs,
      billing: { ...billing, aiCreditsUsed: 0, aiCreditsPurchased: 0 },
    })
  }, [persist, profile, onboarded, prefs, billing])

  const canAccess = useCallback(
    (module: AppModule) => canAccessModule(planTier, module),
    [planTier],
  )

  const canAccessRoute = useCallback(
    (pathname: string) => canAccessPath(planTier, pathname),
    [planTier],
  )

  const updatePrefs = useCallback(
    (patch: Partial<FreyaPrefs>) => {
      persist({ profile, onboarded, prefs: { ...prefs, ...patch }, billing })
    },
    [persist, profile, onboarded, prefs, billing],
  )

  const connectPlatform = useCallback(
    (platform: Platform) => {
      if (prefs.connectedPlatforms.includes(platform)) return
      updatePrefs({ connectedPlatforms: [...prefs.connectedPlatforms, platform] })
    },
    [prefs.connectedPlatforms, updatePrefs],
  )

  const disconnectPlatform = useCallback(
    (platform: Platform) => {
      updatePrefs({
        connectedPlatforms: prefs.connectedPlatforms.filter((p) => p !== platform),
      })
    },
    [prefs.connectedPlatforms, updatePrefs],
  )

  const startTour = useCallback(() => {
    updatePrefs({ tourActive: true, tourStep: 0 })
  }, [updatePrefs])

  const nextTourStep = useCallback(() => {
    const next = prefs.tourStep + 1
    if (next >= FREYA_TOUR_LENGTH) {
      updatePrefs({ tourActive: false, tourStep: 0, tourCompleted: true })
      return
    }
    updatePrefs({ tourStep: next })
  }, [prefs.tourStep, updatePrefs])

  const endTour = useCallback(
    (completed = false) => {
      updatePrefs({
        tourActive: false,
        tourStep: 0,
        tourCompleted: completed || prefs.tourCompleted,
      })
    },
    [prefs.tourCompleted, updatePrefs],
  )

  const value = useMemo(
    () => ({
      profile,
      onboarded,
      prefs,
      billing,
      planTier,
      entitlements,
      seatLimit,
      aiCreditsRemaining,
      canAccess,
      canAccessRoute,
      setPlanTier,
      setPurchasedSeats,
      spendAiCredits,
      buyAiCreditPack,
      resetAiCreditsDemo,
      login,
      completeOnboarding,
      logout,
      updateGoals,
      updatePlatforms,
      updateProfile,
      updatePrefs,
      connectPlatform,
      disconnectPlatform,
      startTour,
      nextTourStep,
      endTour,
    }),
    [
      profile,
      onboarded,
      prefs,
      billing,
      planTier,
      entitlements,
      seatLimit,
      aiCreditsRemaining,
      canAccess,
      canAccessRoute,
      setPlanTier,
      setPurchasedSeats,
      spendAiCredits,
      buyAiCreditPack,
      resetAiCreditsDemo,
      login,
      completeOnboarding,
      logout,
      updateGoals,
      updatePlatforms,
      updateProfile,
      updatePrefs,
      connectPlatform,
      disconnectPlatform,
      startTour,
      nextTourStep,
      endTour,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
