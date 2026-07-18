import type { NewCampaignInput } from '../context/CampaignsContext'
import type { Platform } from '../data/mockData'
import type { CrmSegment } from '../data/crmData'
import type { ExpenseCategory } from '../data/moneyData'

const DEFAULT_CAPTION =
  "Fresh out of the oven this morning 🥐 Our buttery croissants are ready — grab one with a coffee before they're gone. Tag someone who needs this today!"

function has(words: string[], text: string) {
  return words.some((w) => text.includes(w))
}

export function freyaDraftCaption(prompt: string, fallback = DEFAULT_CAPTION): string {
  const p = prompt.trim()
  if (!p) return fallback
  const lower = p.toLowerCase()
  if (has(['croissant', 'pastry', 'bakery', 'bread'], lower)) {
    return `Morning glow on fresh ${p.includes('croissant') ? 'croissants' : 'bakes'} 🥐 Buttery layers, still warm — swing by before the tray runs out. Who are you sharing one with?`
  }
  if (has(['coffee', 'latte', 'espresso'], lower)) {
    return `Slow morning, perfect pour ☕ ${p} — pair it with something sweet from the counter. Open till 4pm.`
  }
  if (has(['weekend', 'saturday', 'sunday'], lower)) {
    return `Weekend mode: ON 🌤️ ${p} — trays are out, music's low, seats are open. See you at the shop!`
  }
  if (has(['sale', 'discount', 'promo', 'offer'], lower)) {
    return `Quick treat for you 🎉 ${p} — this week only. Save this post & show it at the counter.`
  }
  return `${p} ✨ Made fresh today — we'd love to see you. Comment if you want us to set one aside!`
}

export function freyaPickPostTag(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (has(['coffee', 'latte', 'drink'], lower)) return 'Coffee'
  if (has(['lifestyle', 'morning', 'vibe', 'community'], lower)) return 'Lifestyle'
  if (has(['product', 'menu', 'new'], lower)) return 'Product'
  return 'Food'
}

export function freyaPickPlatform(prompt: string): Platform {
  return freyaPickPlatforms(prompt)[0] ?? 'Instagram'
}

export function freyaPickPlatforms(prompt: string): Platform[] {
  const lower = prompt.toLowerCase()
  if (has(['all', 'everywhere', 'cross-post', 'cross post', 'all platforms'], lower)) {
    return ['Instagram', 'Facebook', 'LinkedIn']
  }
  const picks: Platform[] = []
  if (has(['linkedin', 'b2b', 'professional', 'corporate'], lower)) picks.push('LinkedIn')
  if (has(['facebook', 'fb', 'community', 'local'], lower)) picks.push('Facebook')
  if (has(['instagram', 'ig', 'reel', 'story'], lower)) picks.push('Instagram')
  if (picks.length === 0) return ['Instagram']
  return picks
}

export function freyaFillCampaign(prompt: string): NewCampaignInput {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  const title = p
    ? p.length > 48
      ? `${p.slice(0, 45)}…`
      : p.charAt(0).toUpperCase() + p.slice(1)
    : 'Weekend Foot Traffic Boost'
  return {
    title,
    goal: p || 'Get more people into the shop this weekend.',
    audience: has(['corporate', 'office', 'b2b'], lower)
      ? 'Nearby offices and team leads ordering catering.'
      : 'Locals within 5km who love fresh baked goods.',
    platforms: has(['linkedin'], lower)
      ? ['LinkedIn']
      : has(['facebook'], lower)
        ? ['Facebook']
        : ['Instagram', 'Facebook'],
    budget: has(['big', 'large', '500'], lower) ? '500' : '200',
    objective: has(['lead', 'signup', 'email'], lower)
      ? 'Lead gen'
      : has(['awareness', 'brand'], lower)
        ? 'Awareness'
        : 'Foot traffic',
    tone: has(['playful', 'fun', 'excited'], lower)
      ? 'Excited & playful'
      : has(['professional', 'formal'], lower)
        ? 'Professional & reliable'
        : 'Warm, local, inviting',
  }
}

export function freyaFillLead(prompt: string) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  const name = has(['sarah'], lower)
    ? 'Sarah Chen'
    : has(['mike', 'michael'], lower)
      ? 'Michael Torres'
      : p.split(/[,.\n]/)[0]?.trim().split(' ').slice(0, 2).join(' ') || 'New lead'
  return {
    name: name.length > 2 ? name : 'Jordan Lee',
    email: '',
    company: has(['wedding', 'event'], lower) ? 'Private event' : has(['corporate', 'office'], lower) ? 'Local office' : '',
    note: p || 'Interested in our products — Freya to follow up.',
    tags: has(['wedding'], lower)
      ? ['Wedding', 'Events']
      : has(['corporate', 'catering'], lower)
        ? ['Corporate', 'Catering']
        : ['Local'],
  }
}

export function freyaFillDeal(prompt: string, segment: CrmSegment) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  return {
    title: p || (segment === 'b2c' ? 'Custom celebration order' : 'Catering package'),
    company: segment === 'b2b' ? 'Local business' : '',
    contact: 'New contact',
    email: '',
    value: has(['5000', '5k', 'large'], lower) ? '5000' : has(['500', 'small'], lower) ? '500' : '1200',
    product: has(['cake', 'wedding'], lower) ? 'Custom cake' : has(['catering', 'tray'], lower) ? 'Catering' : 'Custom',
    nextStep: 'Freya to send intro & quote',
    note: p || 'Freya drafted from your brief.',
    owner: 'Freya',
  }
}

export function freyaFillTemplate(prompt: string) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  return {
    name: p ? (p.length > 36 ? `${p.slice(0, 33)}…` : p) : 'Freya quick post',
    structure: has(['story', 'narrative'], lower)
      ? '[Scene] + [Sensory detail] + [Soft CTA]'
      : '[Hook] + [Product moment] + [CTA]',
    visual: has(['flat', 'overhead'], lower)
      ? 'Overhead flat-lay, warm morning light'
      : has(['portrait', 'person'], lower)
        ? 'Lifestyle portrait, shallow depth of field'
        : 'Close-up hero shot, soft natural light',
    exampleCaption: freyaDraftCaption(p),
  }
}

export function freyaFillInvoice(prompt: string) {
  const p = prompt.trim()
  return {
    description: p || 'Catering order — invoice drafted by Freya',
    amount: '450',
  }
}

export function freyaFillBill(prompt: string) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  return {
    description: p || 'Supplier invoice — drafted by Freya',
    amount: '320',
    category: (has(['ingredient', 'flour', 'supply'], lower) ? 'Ingredients' : 'Operations') as ExpenseCategory,
  }
}

export function freyaFillExpense(prompt: string) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  const merchant = p.split(/[—\-,]/)[0]?.trim() || 'Supply run'
  return {
    merchant: merchant.length > 2 ? merchant : 'Local supplier',
    amount: '84',
    category: (has(['fuel', 'gas', 'travel'], lower) ? 'Travel' : has(['ingredient', 'grocery'], lower) ? 'Ingredients' : 'Other') as ExpenseCategory,
    notes: p || undefined,
  }
}

export function freyaFillContact(prompt: string, segment: CrmSegment) {
  const lead = freyaFillLead(prompt)
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
    industry: has(['tech', 'software'], lower) ? 'Technology' : has(['food', 'cafe', 'bakery'], lower) ? 'Food & Beverage' : 'Other',
    notes: p || undefined,
  }
}
