import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
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
import { asPlatform } from '@/lib/backend/mappers'
import { apiFetch } from '@/lib/backend/api'
import { useBackendMode } from '@/lib/backend/BackendModeContext'
import { hasSupabaseEnv } from '@/lib/backend/mode'
import {
  platformsFromChannels,
  type ConnectedChannel,
} from '@/lib/socialPageUrl'

/** Keep in sync with STEPS in FreyaTour.tsx */
const FREYA_TOUR_LENGTH = 3

const STORAGE_KEY = 'antarious-demo-v3-bd'

export type FreyaTone = 'warm' | 'professional' | 'playful'

export interface FreyaPrefs {
  tone: FreyaTone
  autoApprove: boolean
  connectedPlatforms: Platform[]
  /** Connected channels with optional public page URLs. */
  connectedChannels: ConnectedChannel[]
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
  connectedChannels: [],
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

type MeResponse = {
  organizationId?: string
  email?: string | null
  profile: BusinessProfile
  onboarded: boolean
  prefs: FreyaPrefs & {
    connectedChannels?: ConnectedChannel[]
  }
  credits: number
  planTier: PlanTier
  billing?: BillingDemo
}

function normalizeProfile(profile: BusinessProfile | null): BusinessProfile | null {
  if (!profile) return null
  return {
    ...profile,
    planTier: profile.planTier ?? 'starter',
    goals: (profile.goals ?? []) as GoalId[],
    platforms: (profile.platforms ?? []) as Platform[],
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

function normalizePrefs(raw?: Partial<FreyaPrefs> | null): FreyaPrefs {
  const connectedChannelsRaw = Array.isArray(raw?.connectedChannels)
    ? raw!.connectedChannels!
    : []
  let connectedChannels: ConnectedChannel[] = connectedChannelsRaw
    .map((c) => {
      const platformRaw = String((c as ConnectedChannel).platform || '').trim()
      if (!platformRaw) return null
      return {
        platform: asPlatform(platformRaw),
        pageUrl: String((c as ConnectedChannel).pageUrl || '').trim(),
      }
    })
    .filter((c): c is ConnectedChannel => !!c)

  const platforms = (raw?.connectedPlatforms ?? [])
    .map((p) => String(p).trim())
    .filter(Boolean)
    .map((p) => asPlatform(p))
  if (!connectedChannels.length && platforms.length) {
    connectedChannels = platforms.map((platform) => ({ platform, pageUrl: '' }))
  }

  return {
    ...DEFAULT_PREFS,
    ...raw,
    connectedChannels,
    connectedPlatforms: connectedChannels.length
      ? platformsFromChannels(connectedChannels)
      : platforms,
    tourStep: typeof raw?.tourStep === 'number' ? raw.tourStep : 0,
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
      prefs: normalizePrefs(parsed.prefs),
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
  /** Supabase org id when hydrated from backend; null in local demo mode. */
  organizationId: string | null
  /** Signed-in account email from /api/me (backend); null in demo. */
  accountEmail: string | null
  planTier: PlanTier
  entitlements: PlanEntitlements
  seatLimit: number
  aiCreditsRemaining: number
  /** True once demo localStorage or /api/me hydration finished. */
  hydrated: boolean
  canAccess: (module: AppModule) => boolean
  canAccessRoute: (pathname: string) => boolean
  setPlanTier: (tier: PlanTier) => void
  setPurchasedSeats: (count: number) => void
  spendAiCredits: (amount?: number) => boolean
  buyAiCreditPack: (packId: AiCreditPackId) => void
  resetAiCreditsDemo: () => void
  login: (name: string) => void
  /** After Supabase auth — load org profile from /api/me. */
  hydrateFromBackend: () => Promise<MeResponse | null>
  completeOnboarding: (data: Omit<BusinessProfile, 'ownerName'>) => void
  logout: () => void
  updateGoals: (goals: GoalId[]) => void
  updatePlatforms: (platforms: Platform[]) => void
  updateProfile: (patch: Partial<BusinessProfile>) => Promise<void>
  updatePrefs: (patch: Partial<FreyaPrefs>) => void
  connectPlatform: (platform: Platform, pageUrl?: string) => void
  disconnectPlatform: (platform: Platform) => void
  updateChannelPageUrl: (platform: Platform, pageUrl: string) => void
  startTour: () => void
  nextTourStep: () => void
  endTour: (completed?: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { backend, ready: backendReady, envConfigured } = useBackendMode()
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [onboarded, setOnboarded] = useState(false)
  const [prefs, setPrefs] = useState<FreyaPrefs>({ ...DEFAULT_PREFS })
  const [billing, setBilling] = useState<BillingDemo>({ ...DEFAULT_BILLING })
  const [serverCredits, setServerCredits] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const applyMe = useCallback((me: MeResponse) => {
    setProfile((prev) => {
      const nextProfile = normalizeProfile({
        ...me.profile,
        planTier: me.planTier ?? me.profile.planTier ?? 'starter',
        platforms: (me.profile.platforms ?? []).map((p) => asPlatform(p)),
      })
      if (!nextProfile) return nextProfile
      // Keep optimistic brand URLs if the server path matches but signed URL is missing,
      // or if a newer local path hasn't been reflected yet (in-flight PATCH).
      if (prev?.coverPath && prev.coverUrl) {
        if (
          prev.coverPath === nextProfile.coverPath &&
          !nextProfile.coverUrl
        ) {
          nextProfile.coverUrl = prev.coverUrl
        } else if (
          prev.coverPath !== nextProfile.coverPath &&
          prev.coverPath &&
          !nextProfile.coverPath
        ) {
          nextProfile.coverPath = prev.coverPath
          nextProfile.coverUrl = prev.coverUrl
        }
      }
      if (prev?.logoPath && prev.logoUrl) {
        if (prev.logoPath === nextProfile.logoPath && !nextProfile.logoUrl) {
          nextProfile.logoUrl = prev.logoUrl
        } else if (
          prev.logoPath !== nextProfile.logoPath &&
          prev.logoPath &&
          !nextProfile.logoPath
        ) {
          nextProfile.logoPath = prev.logoPath
          nextProfile.logoUrl = prev.logoUrl
        }
      }
      return nextProfile
    })
    setOrganizationId(me.organizationId ?? null)
    setAccountEmail(typeof me.email === 'string' && me.email.trim() ? me.email.trim() : null)
    setOnboarded(me.onboarded)
    setPrefs(normalizePrefs(me.prefs))
    setServerCredits(me.credits)
    setBilling(
      normalizeBilling(
        me.billing ?? {
          purchasedSeats: 3,
          aiCreditsUsed: 0,
          aiCreditsPurchased: Math.max(0, me.credits),
        },
      ),
    )
  }, [])

  const hydrateFromBackend = useCallback(async () => {
    try {
      const me = await apiFetch<MeResponse>('/api/me')
      applyMe(me)
      setHydrated(true)
      return me
    } catch {
      setProfile(null)
      setOrganizationId(null)
      setAccountEmail(null)
      setOnboarded(false)
      setPrefs({ ...DEFAULT_PREFS })
      setBilling({ ...DEFAULT_BILLING })
      setServerCredits(null)
      setHydrated(true)
      return null
    }
  }, [applyMe])

  useEffect(() => {
    if (!backendReady) return
    if (!backend) {
      if (envConfigured) {
        // Env present but no session — stay logged out (don't revive demo storage).
        setProfile(null)
        setOrganizationId(null)
        setAccountEmail(null)
        setOnboarded(false)
        setPrefs({ ...DEFAULT_PREFS })
        setBilling({ ...DEFAULT_BILLING })
        setServerCredits(null)
        setHydrated(true)
        return
      }
      const initial = loadState()
      setProfile(initial.profile)
      setOnboarded(initial.onboarded)
      setPrefs(initial.prefs)
      setBilling(initial.billing)
      setServerCredits(null)
      setHydrated(true)
      return
    }
    void hydrateFromBackend()
  }, [backend, backendReady, envConfigured, hydrateFromBackend])

  const planTier: PlanTier = profile?.planTier ?? 'starter'
  const entitlements = getEntitlements(planTier)
  const seatLimit = billing.purchasedSeats
  const aiCreditsRemaining =
    serverCredits !== null
      ? serverCredits
      : aiCreditBalance(planTier, billing.aiCreditsPurchased, billing.aiCreditsUsed)

  const persist = useCallback(
    (next: StoredState) => {
      const normalized = {
        ...next,
        profile: normalizeProfile(next.profile),
        billing: normalizeBilling(next.billing),
      }
      setProfile(normalized.profile)
      setOnboarded(normalized.onboarded)
      setPrefs(normalized.prefs)
      setBilling(normalized.billing)
      if (!backend) saveState(normalized)
    },
    [backend],
  )

  const login = useCallback(
    (name: string) => {
      persist({
        profile: {
          ownerName: name.trim() || 'Nusrat',
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
      setHydrated(true)
    },
    [persist],
  )

  const completeOnboarding = useCallback(
    (data: Omit<BusinessProfile, 'ownerName'>) => {
      const ownerName = profile?.ownerName || 'Nusrat'
      if (backend) {
        void apiFetch('/api/onboarding/complete', {
          method: 'POST',
          body: JSON.stringify({ ownerName, ...data }),
        })
          .then(() => hydrateFromBackend())
          .catch(() => {
            // Optimistic local so AuthGate can proceed
            setProfile(normalizeProfile({ ownerName, ...data }))
            setOnboarded(true)
          })
        setProfile(normalizeProfile({ ownerName, ...data, planTier: data.planTier ?? 'starter' }))
        setOnboarded(true)
        setPrefs((p) =>
          normalizePrefs({
            ...p,
            connectedPlatforms: [],
            connectedChannels: [],
            tourCompleted: false,
            tourActive: true,
            tourStep: 0,
          }),
        )
        return
      }
      persist({
        profile: {
          ownerName,
          ...data,
          planTier: data.planTier ?? 'starter',
        },
        onboarded: true,
        prefs: normalizePrefs({
          ...prefs,
          connectedPlatforms: [],
          connectedChannels: [],
          tourCompleted: false,
          tourActive: true,
          tourStep: 0,
        }),
        billing,
      })
    },
    [backend, billing, hydrateFromBackend, persist, prefs, profile?.ownerName],
  )

  const logout = useCallback(() => {
    clearAntariousStorage()
    setProfile(null)
    setOrganizationId(null)
    setAccountEmail(null)
    setOnboarded(false)
    setPrefs({ ...DEFAULT_PREFS })
    setBilling({ ...DEFAULT_BILLING })
    setServerCredits(null)
    void (async () => {
      try {
        if (hasSupabaseEnv()) {
          const { createClient } = await import('@/lib/supabase/client')
          await createClient().auth.signOut()
        }
      } catch {
        // ignore
      }
      window.location.assign('/')
    })()
  }, [])

  const updateGoals = useCallback(
    (goals: GoalId[]) => {
      if (!profile) return
      if (backend) {
        void apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ profile: { goals } }),
        })
      }
      persist({ profile: { ...profile, goals }, onboarded, prefs, billing })
    },
    [backend, persist, profile, onboarded, prefs, billing],
  )

  const updatePlatforms = useCallback(
    (platforms: Platform[]) => {
      if (!profile) return
      if (backend) {
        void apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ profile: { platforms } }),
        })
      }
      persist({ profile: { ...profile, platforms }, onboarded, prefs, billing })
    },
    [backend, persist, profile, onboarded, prefs, billing],
  )

  const updateProfile = useCallback(
    async (patch: Partial<BusinessProfile>) => {
      if (!profile) return
      // Optimistic local update first so cover/logo change is visible immediately.
      persist({ profile: { ...profile, ...patch }, onboarded, prefs, billing })
      if (!backend) return
      // Persist only server-known fields (never send ephemeral blob: URLs as paths).
      const serverPatch: Record<string, unknown> = {}
      const keys = [
        'ownerName',
        'businessName',
        'industry',
        'customers',
        'businessType',
        'audienceServe',
        'teamSize',
        'goals',
        'platforms',
        'planTier',
        'coverPath',
        'logoPath',
      ] as const
      for (const key of keys) {
        if (key in patch) serverPatch[key] = patch[key]
      }
      if (!Object.keys(serverPatch).length) return
      await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ profile: serverPatch }),
      })
    },
    [backend, persist, profile, onboarded, prefs, billing],
  )

  const setPlanTier = useCallback(
    (tier: PlanTier) => {
      if (!profile) return
      if (backend) {
        void apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ profile: { planTier: tier } }),
        })
      }
      persist({ profile: { ...profile, planTier: tier }, onboarded, prefs, billing })
    },
    [backend, persist, profile, onboarded, prefs, billing],
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
      if (backend) {
        // Server debits on agent routes; allow optimistic local decrement for UI.
        if (serverCredits !== null && serverCredits < need) return false
        setServerCredits((c) => (c === null ? c : Math.max(0, c - need)))
        return true
      }
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
    [backend, serverCredits, persist, profile, onboarded, prefs, billing, planTier],
  )

  const buyAiCreditPack = useCallback(
    (packId: AiCreditPackId) => {
      const pack = getAiCreditPack(packId)
      if (!pack) return
      if (backend) {
        void apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ buyCreditPack: packId }),
        }).then(() => hydrateFromBackend())
        setServerCredits((c) => (c === null ? pack.credits : c + pack.credits))
        return
      }
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
    [backend, hydrateFromBackend, persist, profile, onboarded, prefs, billing],
  )

  const resetAiCreditsDemo = useCallback(() => {
    if (backend) return
    persist({
      profile,
      onboarded,
      prefs,
      billing: { ...billing, aiCreditsUsed: 0, aiCreditsPurchased: 0 },
    })
  }, [backend, persist, profile, onboarded, prefs, billing])

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
      if (backend) {
        void apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ prefs: patch }),
        })
      }
      persist({ profile, onboarded, prefs: { ...prefs, ...patch }, billing })
    },
    [backend, persist, profile, onboarded, prefs, billing],
  )

  const connectPlatform = useCallback(
    (platform: Platform, pageUrl = '') => {
      if (prefs.connectedPlatforms.includes(platform)) return
      const nextChannels: ConnectedChannel[] = [
        ...prefs.connectedChannels.filter((c) => c.platform !== platform),
        { platform, pageUrl: pageUrl.trim() },
      ]
      const nextPrefs = normalizePrefs({
        ...prefs,
        connectedChannels: nextChannels,
      })
      if (backend) {
        void apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ connectPlatform: platform, pageUrl: pageUrl.trim() || undefined }),
        }).then(() => hydrateFromBackend())
      }
      persist({
        profile,
        onboarded,
        prefs: nextPrefs,
        billing,
      })
    },
    [backend, prefs, profile, onboarded, billing, persist, hydrateFromBackend],
  )

  const disconnectPlatform = useCallback(
    (platform: Platform) => {
      const nextPrefs = normalizePrefs({
        ...prefs,
        connectedChannels: prefs.connectedChannels.filter((c) => c.platform !== platform),
        connectedPlatforms: prefs.connectedPlatforms.filter((p) => p !== platform),
      })
      if (backend) {
        void apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ disconnectPlatform: platform }),
        }).then(() => hydrateFromBackend())
      }
      persist({
        profile,
        onboarded,
        prefs: nextPrefs,
        billing,
      })
    },
    [backend, prefs, profile, onboarded, billing, persist, hydrateFromBackend],
  )

  const updateChannelPageUrl = useCallback(
    (platform: Platform, pageUrl: string) => {
      const nextChannels = prefs.connectedChannels.map((c) =>
        c.platform === platform ? { ...c, pageUrl: pageUrl.trim() } : c,
      )
      if (!nextChannels.some((c) => c.platform === platform) && prefs.connectedPlatforms.includes(platform)) {
        nextChannels.push({ platform, pageUrl: pageUrl.trim() })
      }
      const nextPrefs = normalizePrefs({ ...prefs, connectedChannels: nextChannels })
      if (backend) {
        void apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({
            updateChannelPageUrl: { platform, pageUrl: pageUrl.trim() },
          }),
        }).then(() => hydrateFromBackend())
      }
      persist({ profile, onboarded, prefs: nextPrefs, billing })
    },
    [backend, prefs, profile, onboarded, billing, persist, hydrateFromBackend],
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
      organizationId,
      accountEmail,
      onboarded,
      prefs,
      billing,
      planTier,
      entitlements,
      seatLimit,
      aiCreditsRemaining,
      hydrated,
      canAccess,
      canAccessRoute,
      setPlanTier,
      setPurchasedSeats,
      spendAiCredits,
      buyAiCreditPack,
      resetAiCreditsDemo,
      login,
      hydrateFromBackend,
      completeOnboarding,
      logout,
      updateGoals,
      updatePlatforms,
      updateProfile,
      updatePrefs,
      connectPlatform,
      disconnectPlatform,
      updateChannelPageUrl,
      startTour,
      nextTourStep,
      endTour,
    }),
    [
      profile,
      organizationId,
      accountEmail,
      onboarded,
      prefs,
      billing,
      planTier,
      entitlements,
      seatLimit,
      aiCreditsRemaining,
      hydrated,
      canAccess,
      canAccessRoute,
      setPlanTier,
      setPurchasedSeats,
      spendAiCredits,
      buyAiCreditPack,
      resetAiCreditsDemo,
      login,
      hydrateFromBackend,
      completeOnboarding,
      logout,
      updateGoals,
      updatePlatforms,
      updateProfile,
      updatePrefs,
      connectPlatform,
      disconnectPlatform,
      updateChannelPageUrl,
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
