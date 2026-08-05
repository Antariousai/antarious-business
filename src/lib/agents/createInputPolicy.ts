/** Shared policy: never invent names/amounts; return NEED_INPUT instead of writing. */

export type CreateWriteTool =
  | 'create_lead'
  | 'create_deal'
  | 'draft_invoice'
  | 'draft_bill'
  | 'create_post_draft'
  | 'create_campaign_draft'
  | 'update_business_profile'
  | 'update_lead_stage'
  | 'update_post_draft'
  | 'schedule_post'
  | 'remind_invoice'
  | 'update_campaign_status'
  | 'draft_reply'
  | 'suggest_next_step'

export type NeedInputMode = 'ask_fact' | 'suggest_options'

export type NeedInputResult = {
  ok: false
  code: 'NEED_INPUT'
  missing: string[]
  askHint: string
  /** ask_fact = owner-only truth (names, parties). suggest_options = Freya may offer 2–3 picks. */
  mode: NeedInputMode
  /** Concrete starter options Freya should adapt to this business in chat. */
  options?: string[]
}

const PLACEHOLDER_EXACT = new Set(
  [
    'new customer',
    'new lead',
    'new deal',
    'customer',
    'a customer',
    'the customer',
    'someone',
    'somebody',
    'tbd',
    'tba',
    'unknown',
    'test',
    'testing',
    'n/a',
    'na',
    'none',
    'placeholder',
    'untitled',
    'no name',
    'name',
    // Bangla / Banglish equivalents
    'notun customer',
    'notun lead',
    'notun khoddar',
    'khoddar',
    'keu',
    'keu ekjon',
    'ojana',
    'ajana',
    'টেস্ট',
    'নতুন কাস্টমার',
    'নতুন গ্রাহক',
    'কেউ',
    'কেউ একজন',
    'অজানা',
    'গ্রাহক',
    'কাস্টমার',
  ].map((s) => s.toLowerCase()),
)

const GENERIC_CAPTION =
  /^(check (this|us|it) out|new (post|offer|drop)|coming soon|stay tuned|follow us|dm (us|for more)|limited time|hello world)[!?.]*$/i

const FIELD_LABELS: Record<string, string> = {
  name: "the person's name",
  title: 'a title / customer name',
  valueBdt: 'the amount in ৳',
  totalBdt: 'the amount in ৳',
  notes: 'who or what it is for',
  topic: 'what the post is about',
  caption: 'a topic so the caption is grounded',
  goal: 'a real campaign theme or goal',
  campaignTheme: 'a campaign title or goal from the owner',
  profileField: 'at least one profile field they stated',
  leadId: 'which Interested person (id or clear name from a list)',
  postId: 'which post (id from list_posts)',
  scheduledAt: 'when to schedule it',
  invoiceId: 'which invoice (id from list_invoices)',
  campaignId: 'which campaign (id from list_campaigns)',
  threadId: 'which inbox thread (id from list_threads)',
  body: 'the reply text grounded in the thread',
  dealId: 'which deal (id from list_deals)',
}

function norm(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function isPlaceholderName(value: string): boolean {
  const n = norm(value)
  if (!n) return true
  if (PLACEHOLDER_EXACT.has(n)) return true
  // Catch "New Customer 1", "customer #2", "test lead"
  if (/^(new\s+)?(customer|lead|deal|someone|somebody|test)(\s*#?\d+)?$/.test(n)) return true
  if (/^(notun|নতুন)\s+(customer|khoddar|lead|গ্রাহক|কাস্টমার)$/.test(n)) return true
  return false
}

function isGenericCaption(caption: string): boolean {
  const t = caption.trim()
  if (t.length < 12) return true
  const collapsed = t.replace(/\s+/g, ' ')
  if (GENERIC_CAPTION.test(collapsed)) return true
  // Filler opener with no real offer detail
  if (/^check (this|us|it) out\b/i.test(collapsed) && collapsed.length < 40) return true
  if (isPlaceholderName(t)) return true
  return false
}

function hasRealText(value: unknown): boolean {
  if (value == null) return false
  const s = String(value).trim()
  if (!s) return false
  return !isPlaceholderName(s)
}

function hasNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Returns missing required field keys for a write tool. Empty = ok to insert.
 */
export function missingCreateFields(
  tool: CreateWriteTool | string,
  args: Record<string, unknown>,
): string[] {
  switch (tool) {
    case 'create_lead': {
      const missing: string[] = []
      if (!hasRealText(args.name)) missing.push('name')
      return missing
    }
    case 'create_deal': {
      const missing: string[] = []
      if (!hasRealText(args.title)) missing.push('title')
      if (!hasNumber(args.valueBdt)) missing.push('valueBdt')
      return missing
    }
    case 'draft_invoice':
    case 'draft_bill': {
      const missing: string[] = []
      if (!hasNumber(args.totalBdt)) missing.push('totalBdt')
      if (!hasRealText(args.notes)) missing.push('notes')
      return missing
    }
    case 'create_post_draft': {
      const topicOk = hasRealText(args.topic)
      const caption = String(args.caption ?? '').trim()
      if (topicOk) return []
      if (!caption || isGenericCaption(caption)) return ['topic']
      return []
    }
    case 'create_campaign_draft': {
      const titleOk = hasRealText(args.title)
      const goalOk = hasRealText(args.goal)
      if (titleOk || goalOk) return []
      return ['campaignTheme']
    }
    case 'update_business_profile': {
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
      ] as const
      const real = keys.some((k) => {
        const v = args[k]
        if (v == null) return false
        if (Array.isArray(v)) return v.length > 0
        if (typeof v === 'string') return hasRealText(v)
        return true
      })
      return real ? [] : ['profileField']
    }
    case 'update_lead_stage':
      return hasRealText(args.leadId) ? [] : ['leadId']
    case 'update_post_draft':
      return hasRealText(args.postId) ? [] : ['postId']
    case 'schedule_post': {
      const missing: string[] = []
      if (!hasRealText(args.postId)) missing.push('postId')
      if (!hasRealText(args.scheduledAt)) missing.push('scheduledAt')
      return missing
    }
    case 'remind_invoice':
      return hasRealText(args.invoiceId) ? [] : ['invoiceId']
    case 'update_campaign_status':
      return hasRealText(args.campaignId) ? [] : ['campaignId']
    case 'draft_reply': {
      const missing: string[] = []
      if (!hasRealText(args.threadId)) missing.push('threadId')
      if (!hasRealText(args.body)) missing.push('body')
      return missing
    }
    case 'suggest_next_step':
      return hasRealText(args.dealId) ? [] : ['dealId']
    default:
      return []
  }
}

/** Fields where inventing a fake value is unsafe — Freya must ask, not invent a name. */
const FACT_FIELDS = new Set([
  'name',
  'title',
  'notes',
  'leadId',
  'postId',
  'invoiceId',
  'campaignId',
  'threadId',
  'dealId',
  'profileField',
  'body',
  'scheduledAt',
])

/** Fields where Freya may propose 2–3 choices for the owner to pick. */
const OPTION_FIELDS = new Set(['topic', 'caption', 'goal', 'campaignTheme', 'valueBdt', 'totalBdt'])

export function needInputMode(missing: string[]): NeedInputMode {
  if (missing.some((m) => FACT_FIELDS.has(m))) return 'ask_fact'
  if (missing.length > 0 && missing.every((m) => OPTION_FIELDS.has(m))) return 'suggest_options'
  return 'ask_fact'
}

/**
 * Starter option lines Freya should rewrite with THIS business's industry/offer.
 * Empty when she must ask a fact without inventing people or parties.
 */
export function suggestOptionHints(
  tool: CreateWriteTool | string,
  missing: string[],
): string[] | undefined {
  if (tool === 'create_post_draft' && missing.includes('topic')) {
    return [
      'This week’s walk-in offer',
      'Thank-you / social-proof from a regular',
      'Behind the scenes of how you make it',
    ]
  }
  if (tool === 'create_campaign_draft' && missing.includes('campaignTheme')) {
    return [
      'Weekend walk-ins push',
      'Festival / seasonal pre-order drive',
      'Re-engage quiet customers',
    ]
  }
  if (
    (tool === 'create_deal' && missing.includes('valueBdt') && !missing.includes('title')) ||
    ((tool === 'draft_invoice' || tool === 'draft_bill') &&
      missing.includes('totalBdt') &&
      !missing.includes('notes'))
  ) {
    return ['৳5,000', '৳15,000', '৳50,000']
  }
  return undefined
}

function buildAskHint(
  tool: string,
  missing: string[],
  mode: NeedInputMode,
  options?: string[],
): string {
  const labels = missing.map((m) => FIELD_LABELS[m] ?? m)
  let ask = 'Need a bit more from you before I save that.'
  if (labels.length === 1) ask = `Got it — what's ${labels[0]}?`
  else if (labels.length === 2) ask = `Got it — what's ${labels[0]}, and ${labels[1]}?`
  else if (labels.length > 2) {
    const head = labels.slice(0, -1).join(', ')
    const last = labels[labels.length - 1]
    ask = `Got it — what's ${head}, and ${last}?`
  }

  if (mode === 'suggest_options' && options?.length) {
    const listed = options.map((o, i) => `${i + 1}) ${o}`).join(' ')
    return `${ask} Or pick: ${listed}. Reply with a number, your own idea, or say you decide.`
  }

  // Mixed facts + money: still offer amount brackets when amount is missing next to a name ask
  if (
    missing.includes('valueBdt') ||
    (missing.includes('totalBdt') && !missing.includes('notes'))
  ) {
    return `${ask} If you're unsure on amount, pick ৳5,000 / ৳15,000 / ৳50,000, or say you decide.`
  }

  if (tool === 'create_post_draft' || tool === 'create_campaign_draft') {
    return `${ask} I can also give 2–3 ideas from your business — or say you decide.`
  }

  return ask
}

export function needInputResult(
  tool: CreateWriteTool | string,
  missing: string[],
): NeedInputResult {
  const mode = needInputMode(missing)
  const options = suggestOptionHints(tool, missing)
  return {
    ok: false,
    code: 'NEED_INPUT',
    missing,
    mode,
    ...(options?.length ? { options } : {}),
    askHint: buildAskHint(tool, missing, mode, options),
  }
}

/** Gate helper: return NEED_INPUT payload when required fields are missing. */
export function gateCreateInput(
  tool: CreateWriteTool | string,
  args: Record<string, unknown>,
): NeedInputResult | null {
  const missing = missingCreateFields(tool, args)
  if (missing.length === 0) return null
  return needInputResult(tool, missing)
}
