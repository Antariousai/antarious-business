import type { NewCampaignInput } from '../context/CampaignsContext'
import {
  GOAL_OPTIONS,
  type GoalId,
  type Platform,
} from '../data/mockData'
import type { CrmSegment } from '../data/crmData'
import type { ExpenseCategory } from '../data/moneyData'

/** Business snapshot for Freya offline / client-side drafts. */
export type FreyaBizContext = {
  businessName?: string
  industry?: string
  customers?: string
  goals?: GoalId[]
  platforms?: Platform[]
  tone?: string
}

function has(words: string[], text: string) {
  return words.some((w) => text.includes(w))
}

function bizLabel(ctx?: FreyaBizContext) {
  return ctx?.businessName?.trim() || 'our shop'
}

function whoWeServe(ctx?: FreyaBizContext) {
  return ctx?.customers?.trim() || 'our customers'
}

function industryOf(ctx?: FreyaBizContext) {
  return ctx?.industry?.trim() || 'small business'
}

function primaryGoal(ctx?: FreyaBizContext): GoalId | undefined {
  return ctx?.goals?.[0]
}

function goalPhrase(ctx?: FreyaBizContext) {
  const id = primaryGoal(ctx)
  if (!id) return 'grow the business'
  return GOAL_OPTIONS.find((g) => g.id === id)?.label.toLowerCase() ?? 'grow the business'
}

function titleCaseWords(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Turn a free-text brief into a proper campaign title (not the raw prompt). */
export function freyaCampaignTitle(prompt: string, ctx?: FreyaBizContext): string {
  const p = prompt.trim().replace(/\s+/g, ' ')
  const lower = p.toLowerCase()
  const industry = industryOf(ctx).toLowerCase()

  let theme = ''
  if (has(['eid', 'festive', 'puja'], lower)) theme = 'Festive Push'
  else if (has(['weekend', 'saturday', 'sunday'], lower)) theme = 'Weekend Push'
  else if (has(['sale', 'discount', 'offer', 'promo'], lower)) theme = 'Limited Offer'
  else if (has(['launch', 'new', 'drop', 'arrival'], lower)) theme = 'New Arrival'
  else if (has(['lead', 'inquiry', 'interested'], lower)) theme = 'Lead Drive'
  else if (has(['wholesale', 'b2b', 'corporate'], lower)) theme = 'B2B Outreach'
  else if (has(['retention', 'loyal', 'repeat'], lower)) theme = 'Loyalty Push'
  else if (p) {
    // Take a short noun phrase from the prompt (first 3–5 meaningful words)
    const stop = new Set(['a', 'an', 'the', 'for', 'to', 'and', 'of', 'in', 'on', 'with', 'our', 'my'])
    const words = p
      .replace(/[^\w\s&+-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stop.has(w.toLowerCase()))
      .slice(0, 4)
    theme = words.length ? titleCaseWords(words.join(' ')) : 'Growth Push'
  } else {
    theme = 'Growth Push'
  }

  let outcome = 'More Reach'
  const g = primaryGoal(ctx)
  if (has(['foot', 'visit', 'walk-in', 'store', 'shop'], lower) || g === 'customers') {
    outcome = 'More Walk-ins'
  } else if (has(['lead', 'inquiry'], lower) || g === 'leads') {
    outcome = 'More Leads'
  } else if (has(['engage', 'like', 'comment', 'love'], lower) || g === 'engagement') {
    outcome = 'More Engagement'
  } else if (has(['sale', 'order', 'buy', 'revenue'], lower) || g === 'money') {
    outcome = 'More Sales'
  } else if (has(['reply', 'inbox', 'message'], lower) || g === 'replies') {
    outcome = 'Faster Replies'
  } else if (/food|cafe|restaurant|bakery/.test(industry)) {
    outcome = 'More Orders'
  } else if (/tech|software|saas/.test(industry)) {
    outcome = 'More Signups'
  }

  const title = `${outcome} · ${theme}`
  return title.length > 48 ? `${title.slice(0, 45).trim()}…` : title
}

function defaultCaptionFallback(ctx?: FreyaBizContext) {
  const biz = bizLabel(ctx)
  const who = whoWeServe(ctx)
  return `Something fresh from ${biz} this week. Made with ${who} in mind — come see what’s new, or message us and we’ll help you pick.`
}

export function freyaDraftCaption(
  prompt: string,
  fallback?: string,
  ctx?: FreyaBizContext,
): string {
  const p = prompt.trim()
  const base = fallback?.trim() || defaultCaptionFallback(ctx)
  if (!p) return base

  const lower = p.toLowerCase()
  const biz = bizLabel(ctx)
  const who = whoWeServe(ctx)
  const industry = industryOf(ctx)
  const goal = goalPhrase(ctx)

  // Mid-length: hook + context + CTA (~2–4 sentences)
  if (has(['sale', 'discount', 'promo', 'offer'], lower)) {
    return `Quick treat from ${biz}: ${p}. It’s for ${who} who want a good deal without the fuss. Save this post and show us when you’re ready — we’re here to help.`
  }
  if (has(['weekend', 'saturday', 'sunday'], lower)) {
    return `Weekend plans with ${biz}? ${p}. Perfect if you’re one of ${who}. Drop by or message us — we’d love to sort you out.`
  }
  if (has(['eid', 'wedding', 'bridal', 'festive', 'puja'], lower)) {
    return `Occasion mode at ${biz}. ${p}. We’re thinking of ${who} getting ready for something special. Tell us your date and we’ll guide the next step.`
  }
  if (has(['b2b', 'wholesale', 'corporate'], lower)) {
    return `${biz} can support your next order: ${p}. Built for teams and partners who need reliability. Message us with quantity and timing — we’ll reply with a clear quote.`
  }

  return `${p} — from ${biz} (${industry}). We’re focused on helping you ${goal}, especially for ${who}. Comment or DM if you want this set aside.`
}

export function freyaPickPostTag(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (has(['eid', 'wedding', 'bridal', 'festive'], lower)) return 'Occasion'
  if (has(['lifestyle', 'morning', 'vibe', 'community'], lower)) return 'Lifestyle'
  if (has(['product', 'new', 'drop', 'collection'], lower)) return 'Product'
  if (has(['tip', 'how', 'guide'], lower)) return 'Tips'
  if (has(['sale', 'offer', 'promo'], lower)) return 'Promo'
  return 'Update'
}

export function freyaPickPlatform(prompt: string, ctx?: FreyaBizContext): Platform {
  return freyaPickPlatforms(prompt, ctx)[0] ?? 'Instagram'
}

export function freyaPickPlatforms(prompt: string, ctx?: FreyaBizContext): Platform[] {
  const lower = prompt.toLowerCase()
  const preferred = ctx?.platforms?.length ? ctx.platforms : undefined

  if (has(['all', 'everywhere', 'cross-post', 'cross post', 'all platforms'], lower)) {
    return preferred?.length ? preferred : ['Facebook', 'Instagram']
  }
  const picks: Platform[] = []
  if (has(['whatsapp', 'wa'], lower)) picks.push('WhatsApp')
  if (has(['messenger', 'inbox'], lower)) picks.push('Messenger')
  if (has(['facebook', 'fb', 'community', 'local'], lower)) picks.push('Facebook')
  if (has(['instagram', 'ig', 'reel', 'story'], lower)) picks.push('Instagram')
  if (has(['linkedin', 'b2b', 'professional', 'corporate'], lower)) picks.push('LinkedIn')
  if (picks.length) return picks
  if (preferred?.length) return preferred.slice(0, 2)
  return ['Facebook', 'Instagram']
}

export function freyaFillCampaign(prompt: string, ctx?: FreyaBizContext): NewCampaignInput {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  const biz = bizLabel(ctx)
  const who = whoWeServe(ctx)
  const industry = industryOf(ctx)
  const goalFocus = goalPhrase(ctx)
  const title = freyaCampaignTitle(p, ctx)

  const goal = p
    ? `Help ${biz} ${goalFocus} with this: ${p.length > 110 ? `${p.slice(0, 107)}…` : p}`
    : `Help ${biz} ${goalFocus} among ${who} over the next couple of weeks.`

  const audience = has(['corporate', 'office', 'b2b', 'wholesale'], lower)
    ? `Wholesale buyers and partners who need ${industry} solutions from ${biz}.`
    : `${who} — people who already care about ${industry} and are near enough to buy from ${biz}.`

  const objective = has(['lead', 'signup', 'email'], lower)
    ? 'Lead gen'
    : has(['awareness', 'brand'], lower)
      ? 'Awareness'
      : has(['retention', 'loyal', 'repeat'], lower)
        ? 'Retention'
        : has(['sale', 'order', 'buy'], lower)
          ? 'Sales'
          : primaryGoal(ctx) === 'leads'
            ? 'Lead gen'
            : primaryGoal(ctx) === 'engagement'
              ? 'Awareness'
              : 'Foot traffic'

  const tonePref = (ctx?.tone || '').toLowerCase()
  const tone = has(['playful', 'fun', 'excited'], lower) || tonePref === 'playful'
    ? 'Excited & playful'
    : has(['professional', 'formal'], lower) || tonePref === 'professional'
      ? 'Professional & reliable'
      : 'Warm, local, inviting'

  return {
    title,
    goal,
    audience,
    platforms: freyaPickPlatforms(p, ctx),
    budget: has(['big', 'large', '500'], lower) ? '20000' : '8000',
    objective,
    tone,
  }
}

export function freyaFillLead(prompt: string, ctx?: FreyaBizContext) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  const name = has(['sadia'], lower)
    ? 'Sadia Khan'
    : has(['fahim'], lower)
      ? 'Fahim Ahmed'
      : p.split(/[,.\n]/)[0]?.trim().split(' ').slice(0, 2).join(' ') || 'New lead'
  return {
    name: name.length > 2 ? name : 'New contact',
    email: '',
    company: has(['wedding', 'event'], lower)
      ? 'Private event'
      : has(['wholesale', 'traders', 'b2b'], lower)
        ? 'Local wholesale'
        : '',
    note: p || `Interested in ${bizLabel(ctx)} — Freya to follow up.`,
    tags: has(['wedding'], lower)
      ? ['Wedding', 'Events']
      : has(['wholesale', 'b2b'], lower)
        ? ['Wholesale', 'B2B']
        : ['Local'],
  }
}

export function freyaFillDeal(prompt: string, segment: CrmSegment, ctx?: FreyaBizContext) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  return {
    title: p
      ? p.length > 48
        ? `${p.slice(0, 45)}…`
        : p
      : segment === 'b2c'
        ? `Custom order — ${bizLabel(ctx)}`
        : `Wholesale package — ${bizLabel(ctx)}`,
    company: segment === 'b2b' ? 'Local business' : '',
    contact: 'New contact',
    email: '',
    value: has(['50000', '50k', 'large'], lower) ? '50000' : has(['5000', 'small'], lower) ? '5000' : '12000',
    product: has(['lehenga', 'bridal', 'wedding'], lower)
      ? 'Bridal / occasion order'
      : has(['wholesale'], lower)
        ? 'Wholesale pack'
        : 'Custom order',
    nextStep: 'Freya to send intro & quote',
    note: p || `Freya drafted from your brief for ${bizLabel(ctx)}.`,
    owner: 'Freya',
  }
}

export function freyaFillTemplate(prompt: string, ctx?: FreyaBizContext) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  return {
    name: p ? (p.length > 36 ? `${p.slice(0, 33)}…` : p) : `${bizLabel(ctx)} quick post`,
    structure: has(['story', 'narrative'], lower)
      ? '[Scene] + [Sensory detail] + [Soft CTA]'
      : '[Hook] + [Offer detail] + [CTA]',
    visual: has(['flat', 'overhead'], lower)
      ? 'Overhead flat-lay, warm morning light'
      : has(['portrait', 'person'], lower)
        ? 'Lifestyle portrait, shallow depth of field'
        : 'Close-up hero shot, soft natural light',
    exampleCaption: freyaDraftCaption(p, undefined, ctx),
  }
}

export function freyaFillInvoice(prompt: string, ctx?: FreyaBizContext) {
  const p = prompt.trim()
  return {
    description: p || `${bizLabel(ctx)} order — invoice drafted by Freya`,
    amount: '12500',
  }
}

export function freyaFillBill(prompt: string) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  return {
    description: p || 'Supplier invoice — drafted by Freya',
    amount: '16600',
    category: (has(['fabric', 'textile', 'inventory', 'supply'], lower) ? 'Inventory' : 'Other') as ExpenseCategory,
  }
}

export function freyaFillExpense(prompt: string) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  const merchant = p.split(/[—\-,]/)[0]?.trim() || 'Supply run'
  return {
    merchant: merchant.length > 2 ? merchant : 'Local supplier',
    amount: '2800',
    category: (has(['pathao', 'delivery', 'uber'], lower)
      ? 'Delivery'
      : has(['fabric', 'inventory', 'textile'], lower)
        ? 'Inventory'
        : 'Other') as ExpenseCategory,
    notes: p || undefined,
  }
}

export function freyaFillContact(prompt: string, segment: CrmSegment, ctx?: FreyaBizContext) {
  const lead = freyaFillLead(prompt, ctx)
  return {
    name: lead.name,
    email: lead.email,
    phone: '',
    segment,
    companyName: lead.company,
    notes: lead.note,
  }
}

export function freyaFillCompany(prompt: string) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  return {
    name: p.split(/[—\-,]/)[0]?.trim() || 'New company',
    domain: '',
    industry: has(['tech', 'software'], lower)
      ? 'Technology'
      : has(['food', 'cafe', 'bakery', 'restaurant'], lower)
        ? 'Food & Beverage'
        : has(['boutique', 'fashion', 'garment', 'clothing', 'retail'], lower)
          ? 'Retail & Fashion'
          : 'Other',
    notes: p || undefined,
  }
}
