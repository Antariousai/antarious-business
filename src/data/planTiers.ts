/** Starter / Growth / Scale — feature gates + base pricing (seats & AI credits billed separately). */

export type PlanTier = 'starter' | 'growth' | 'scale'

export type TeamSize = 'solo' | 'few' | 'bigger'

export type BusinessTypeChip =
  | 'retail'
  | 'restaurant'
  | 'pharmacy'
  | 'tuition'
  | 'salon'
  | 'garments'
  | 'clinic'
  | 'freelancer'
  | 'other'

/** Module keys used for nav + route gating */
export type AppModule =
  | 'today'
  | 'posts'
  | 'campaigns'
  | 'leads'
  | 'customers'
  | 'messages'
  | 'money'
  | 'ideas'
  | 'templates'
  | 'team'
  | 'settings'

export interface PlanEntitlements {
  id: PlanTier
  label: string
  promise: string
  /** BDT list price for the feature tier (platform fee) */
  priceMonthly: number
  /** Freya AI credits included each month */
  includedAiCredits: number
  maxChannels: number
  modules: AppModule[]
  /** Show Freya “draft everything at once” toggle in create flows */
  advancedCreate: boolean
  deepMoney: boolean
}

export const INCLUDED_OWNER_SEATS = 1
/** Extra teammates beyond the owner (BDT / month) */
export const SEAT_PRICE_MONTHLY = 499

export type AiCreditPackId = 'boost' | 'busy' | 'power'

export interface AiCreditPack {
  id: AiCreditPackId
  label: string
  credits: number
  /** BDT */
  priceBdt: number
}

export const AI_CREDIT_PACKS: AiCreditPack[] = [
  { id: 'boost', label: 'Boost', credits: 1000, priceBdt: 499 },
  { id: 'busy', label: 'Busy month', credits: 5000, priceBdt: 1999 },
  { id: 'power', label: 'Power', credits: 15000, priceBdt: 4999 },
]

export const PLAN_TIERS: Record<PlanTier, PlanEntitlements> = {
  starter: {
    id: 'starter',
    label: 'Starter',
    promise: 'Freya runs the day-to-day. You approve.',
    priceMonthly: 1999,
    includedAiCredits: 1000,
    maxChannels: 2,
    // Leads included so Freya “create a lead” + Interested people work on day one.
    modules: ['today', 'posts', 'messages', 'customers', 'leads', 'money', 'settings'],
    advancedCreate: false,
    deepMoney: false,
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    promise: 'Grow without hiring a marketer.',
    priceMonthly: 4999,
    includedAiCredits: 5000,
    maxChannels: 5,
    modules: [
      'today',
      'posts',
      'campaigns',
      'leads',
      'customers',
      'messages',
      'money',
      'ideas',
      'templates',
      'settings',
    ],
    advancedCreate: true,
    deepMoney: false,
  },
  scale: {
    id: 'scale',
    label: 'Scale',
    promise: 'Team works together; Freya keeps ops tidy.',
    priceMonthly: 12999,
    includedAiCredits: 20000,
    maxChannels: 10,
    modules: [
      'today',
      'posts',
      'campaigns',
      'leads',
      'customers',
      'messages',
      'money',
      'ideas',
      'templates',
      'team',
      'settings',
    ],
    advancedCreate: true,
    deepMoney: true,
  },
}

export function formatPlanPrice(tier: PlanTier | PlanEntitlements): string {
  const price = typeof tier === 'string' ? PLAN_TIERS[tier].priceMonthly : tier.priceMonthly
  return `৳${price.toLocaleString('en-BD')}/mo`
}

export function formatSeatPrice(): string {
  return `৳${SEAT_PRICE_MONTHLY.toLocaleString('en-BD')}/seat/mo`
}

export function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`
}

export function estimateMonthlyTotal(tier: PlanTier, seatCount: number): number {
  const base = PLAN_TIERS[tier].priceMonthly
  const extras = Math.max(0, seatCount - INCLUDED_OWNER_SEATS) * SEAT_PRICE_MONTHLY
  return base + extras
}

export function aiCreditAllowance(
  tier: PlanTier,
  purchasedCredits: number,
): number {
  return PLAN_TIERS[tier].includedAiCredits + Math.max(0, purchasedCredits)
}

export function aiCreditBalance(
  tier: PlanTier,
  purchasedCredits: number,
  usedCredits: number,
): number {
  return Math.max(0, aiCreditAllowance(tier, purchasedCredits) - Math.max(0, usedCredits))
}

export function getAiCreditPack(id: AiCreditPackId): AiCreditPack | undefined {
  return AI_CREDIT_PACKS.find((p) => p.id === id)
}

export const BUSINESS_TYPE_CHIPS: { id: BusinessTypeChip; label: string }[] = [
  { id: 'retail', label: 'Retail shop' },
  { id: 'restaurant', label: 'Restaurant / café' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'tuition', label: 'Tuition / coaching' },
  { id: 'salon', label: 'Salon / beauty' },
  { id: 'garments', label: 'Garments / boutique' },
  { id: 'clinic', label: 'Clinic' },
  { id: 'freelancer', label: 'Freelancer' },
  { id: 'other', label: 'Other' },
]

export const TEAM_SIZE_OPTIONS: { id: TeamSize; label: string; hint: string }[] = [
  { id: 'solo', label: 'Just me', hint: 'Starter · ৳1,999/mo fits most solo owners' },
  { id: 'few', label: 'A few people', hint: 'Growth · ৳4,999/mo for pushes & follow-ups' },
  { id: 'bigger', label: 'A bigger team', hint: 'Scale · ৳12,999/mo when the team shares Freya' },
]

/** Map sidebar/route paths to modules */
export const PATH_MODULE: Record<string, AppModule> = {
  '/app': 'today',
  '/app/content': 'posts',
  '/app/campaigns': 'campaigns',
  '/app/leads': 'leads',
  '/app/pipeline': 'customers',
  '/app/inbox': 'messages',
  '/app/money': 'money',
  '/app/discover': 'ideas',
  '/app/templates': 'templates',
  '/app/team': 'team',
  '/app/settings': 'settings',
  '/app/profile': 'settings',
}

export function getEntitlements(tier: PlanTier | undefined | null): PlanEntitlements {
  return PLAN_TIERS[tier ?? 'starter']
}

export function canAccessModule(tier: PlanTier | undefined | null, module: AppModule): boolean {
  return getEntitlements(tier).modules.includes(module)
}

export function canAccessPath(tier: PlanTier | undefined | null, pathname: string): boolean {
  const match = Object.keys(PATH_MODULE)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || (k !== '/app' && pathname.startsWith(k)))
  if (!match) return true
  return canAccessModule(tier, PATH_MODULE[match])
}

export function recommendPlanTier(teamSize: TeamSize): PlanTier {
  if (teamSize === 'bigger') return 'scale'
  if (teamSize === 'few') return 'growth'
  return 'starter'
}

export function audienceWord(
  customers?: string,
  industry?: string,
  audienceServe?: 'customers' | 'clients' | 'both',
): string {
  if (audienceServe === 'clients') return 'clients'
  if (audienceServe === 'both') return 'customers and clients'
  if (audienceServe === 'customers') return 'customers'
  const blob = `${customers || ''} ${industry || ''}`.toLowerCase()
  if (
    /law|legal|agency|consult|b2b|client|shipping|logistics|supplier|wholesale|professional/.test(
      blob,
    )
  ) {
    return 'clients'
  }
  if (/d2c|brand|online|shop|ecommerce|e-commerce/.test(blob)) return 'customers'
  return 'customers'
}

export const AUDIENCE_SERVE_OPTIONS: {
  id: 'customers' | 'clients' | 'both'
  label: string
  hint: string
}[] = [
  { id: 'customers', label: 'Customers', hint: 'Shoppers, diners, everyday buyers' },
  { id: 'clients', label: 'Clients', hint: 'Law, agency, B2B, professional work' },
  { id: 'both', label: 'Both', hint: 'A mix of customers and clients' },
]

export function minTierForModule(module: AppModule): PlanTier {
  if (PLAN_TIERS.starter.modules.includes(module)) return 'starter'
  if (PLAN_TIERS.growth.modules.includes(module)) return 'growth'
  return 'scale'
}
