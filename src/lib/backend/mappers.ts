import type { Campaign, ContentPost, Platform } from '@/data/mockData'
import { DEMO_IMAGES, ICON_COLORS } from '@/data/mockData'
import type { FreyaActivityArea, FreyaActivityItem, FreyaActivityStatus } from '@/data/freyaActivityData'
import type { InboxChannel, InboxMessage, InboxThread, MessageKind } from '@/data/inboxData'
import type { PostTemplate, TemplateIcon } from '@/data/templatesData'
import {
  AVATAR_PALETTE,
  type Lead,
  type LeadPlatform,
  type LeadSource,
  type LeadStage,
  type LeadTemp,
} from '@/data/leadsData'
import {
  normalizeStage,
  type ActivityType,
  type CrmActivity,
  type CrmCompany,
  type CrmContact,
  type CrmDeal,
  type CrmSegment,
  type FreyaInsight,
  type InsightTone,
} from '@/data/crmData'
import type {
  AccountType,
  BankAccount,
  BankTransaction,
  Bill,
  BillStatus,
  CashMonth,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  Invoice,
  InvoiceStatus,
  LedgerAccount,
  LineItem,
  MoneyParty,
  TxnDirection,
  TxnStatus,
} from '@/data/moneyData'
import type {
  CompetitorWatch,
  ContentIdea,
  DiscoverInsight,
  DiscoverSignal,
  DiscoverTrend,
  SignalAction,
  SignalPlatform,
  SignalStrength,
  SignalType,
  TrendDirection,
} from '@/data/discoverData'

const PLATFORMS: Platform[] = ['Facebook', 'Messenger', 'WhatsApp', 'Instagram', 'LinkedIn']

export function asPlatform(value: unknown, fallback: Platform = 'Instagram'): Platform {
  const s = String(value ?? '')
  return (PLATFORMS.find((p) => p.toLowerCase() === s.toLowerCase()) ?? fallback) as Platform
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatPostDate(
  status: ContentPost['status'],
  scheduledAt?: string | null,
  publishedAt?: string | null,
): string {
  if (status === 'draft') return 'Draft'
  const iso = status === 'scheduled' ? scheduledAt : publishedAt
  if (iso) {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return new Date().toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type ApiPost = {
  id: string
  caption?: string | null
  tag?: string | null
  status?: string | null
  scheduled_at?: string | null
  published_at?: string | null
  image_url?: string | null
  content_post_platforms?: { platform: string }[] | null
  content_assets?: { storage_path?: string; url?: string; mime_type?: string | null }[] | null
}

export function mapApiPost(row: ApiPost): ContentPost {
  const platforms = (row.content_post_platforms ?? []).map((p) => asPlatform(p.platform))
  const status = (row.status === 'scheduled' || row.status === 'published' ? row.status : 'draft') as ContentPost['status']
  const platform = platforms[0] ?? 'Instagram'
  const fromAssets = (row.content_assets ?? []).map((a) => a.url).find(Boolean) ?? ''
  return {
    id: row.id,
    platform,
    platforms: platforms.length ? platforms : [platform],
    author: 'You',
    status,
    caption: row.caption ?? '',
    image: row.image_url || fromAssets || '',
    tag: row.tag ?? 'Food',
    scheduledAt: row.scheduled_at ?? undefined,
    date: formatPostDate(status, row.scheduled_at, row.published_at),
    likes: 0,
    views: 0,
    comments: 0,
    shares: 0,
  }
}

type ApiTemplate = {
  id: string
  name: string
  caption?: string | null
  platforms?: string[] | null
  tag?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export function mapApiTemplate(row: ApiTemplate): PostTemplate {
  const caption = row.caption ?? ''
  return {
    id: row.id,
    name: row.name,
    structure: caption || '[Hook] + [Detail] + [CTA]',
    visual: row.tag || (row.platforms?.length ? row.platforms.join(', ') : 'Custom visual'),
    usedCount: 0,
    lastUsed: formatRelativeTime(row.updated_at ?? row.created_at),
    icon: 'custom' as TemplateIcon,
    exampleCaption: caption || undefined,
    freyaNote: 'Saved in your workspace — Freya can adapt this anytime.',
    createdAt: (row.created_at ?? new Date().toISOString()).slice(0, 10),
  }
}

const CHANNELS: InboxChannel[] = ['facebook', 'instagram', 'whatsapp', 'messenger']

export function asInboxChannel(value: unknown): InboxChannel {
  const s = String(value ?? '').toLowerCase()
  if (s.includes('face')) return 'facebook'
  if (s.includes('insta')) return 'instagram'
  if (s.includes('mess')) return 'messenger'
  if (s.includes('whats')) return 'whatsapp'
  return (CHANNELS.find((c) => c === s) ?? 'whatsapp') as InboxChannel
}

function mapMessageKind(kind: unknown): MessageKind {
  const s = String(kind ?? '')
  if (s === 'freya_draft' || s === 'freya-draft') return 'freya-draft'
  if (s === 'you') return 'you'
  return 'customer'
}

type ApiMessage = {
  id: string
  kind: string
  body: string
  created_at?: string | null
}

type ApiThread = {
  id: string
  contact_name?: string | null
  subject?: string | null
  platform?: string | null
  unread?: boolean | null
  status?: string | null
  last_message_at?: string | null
}

export function mapApiMessage(row: ApiMessage): InboxMessage {
  return {
    id: row.id,
    kind: mapMessageKind(row.kind),
    text: row.body ?? '',
    time: formatRelativeTime(row.created_at),
  }
}

export function mapApiThread(row: ApiThread, messages: InboxMessage[] = []): InboxThread {
  const preview =
    messages.length > 0
      ? messages[messages.length - 1]!.text.slice(0, 48)
      : row.subject || 'Conversation'
  return {
    id: row.id,
    name: row.contact_name || 'Customer',
    handle: row.subject || row.platform || '',
    channel: asInboxChannel(row.platform),
    avatarColor: '#0284c7',
    preview,
    unread: Boolean(row.unread),
    freyaHandling: messages.some((m) => m.kind === 'freya-draft'),
    updatedAt: formatRelativeTime(row.last_message_at),
    messages,
  }
}

type ApiActivity = {
  id: string
  kind?: string | null
  title: string
  summary?: string | null
  status?: string | null
  href?: string | null
  payload?: Record<string, unknown> | null
  created_at?: string | null
}

const KIND_TO_AREA: Record<string, FreyaActivityArea> = {
  publish_post: 'content',
  send_inbox_draft: 'inbox',
  create_lead: 'leads',
  content: 'content',
  inbox: 'inbox',
  leads: 'leads',
  campaigns: 'campaigns',
  money: 'money',
  discover: 'discover',
  crm: 'crm',
  templates: 'templates',
}

function activityKindCard(kind?: string | null): FreyaActivityItem['kind'] {
  if (kind === 'publish_post') return 'post'
  if (kind === 'send_inbox_draft') return 'message'
  return 'generic'
}

export function mapApiActivity(row: ApiActivity): FreyaActivityItem {
  const status = (row.status === 'done' || row.status === 'working' ? row.status : 'waiting') as FreyaActivityStatus
  const kind = row.kind ?? 'generic'
  return {
    id: row.id,
    title: row.title,
    detail: row.summary || '',
    status,
    area: KIND_TO_AREA[kind] ?? 'content',
    time: formatRelativeTime(row.created_at),
    href: row.href ?? undefined,
    actionLabel: status === 'waiting' ? 'Approve' : undefined,
    kind: activityKindCard(kind),
    previewBody: row.summary ?? undefined,
  }
}

/** DB: draft|active|paused|completed → UI: draft|running|paused|done */
export function mapCampaignStatusFromApi(status?: string | null): Campaign['status'] {
  const s = String(status ?? 'draft')
  if (s === 'active') return 'running'
  if (s === 'completed') return 'done'
  if (s === 'paused' || s === 'running' || s === 'done') return s as Campaign['status']
  return 'draft'
}

export function mapCampaignStatusToApi(status: Campaign['status']): string {
  if (status === 'running') return 'active'
  if (status === 'done') return 'completed'
  return status
}

type ApiCampaign = {
  id: string
  title: string
  goal?: string | null
  audience?: string | null
  platforms?: string[] | null
  budget_bdt?: number | null
  objective?: string | null
  tone?: string | null
  status?: string | null
  created_at?: string | null
}

export function mapApiCampaign(row: ApiCampaign, index = 0): Campaign {
  const platforms = (row.platforms ?? []).map((p) => asPlatform(p))
  const budgetNum = Number(row.budget_bdt ?? 0)
  const budgetLabel = budgetNum > 0 ? `$${Math.round(budgetNum)}` : undefined
  const status = mapCampaignStatusFromApi(row.status)
  const title = row.title || 'Campaign'
  return {
    id: row.id,
    title,
    description: row.goal || 'Campaign',
    summary:
      status === 'running'
        ? `Live now — Freya is running ${title}.`
        : status === 'paused'
          ? `Paused — resume anytime.`
          : status === 'draft'
            ? `Draft ready — Freya built the plan. Launch when you approve.`
            : `Completed — ${title}`,
    status,
    iconColor: ICON_COLORS[index % ICON_COLORS.length],
    reach: 0,
    clicks: 0,
    leads: 0,
    goal: row.goal ?? undefined,
    audience: row.audience ?? undefined,
    platforms: platforms.length ? platforms : ['Instagram'],
    budget: budgetLabel,
    reachProgress: 0,
    report: row.goal || `Freya drafted "${title}".`,
    engagementInsight: 'Metrics sync when the campaign is live.',
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
      objective: row.objective || 'Awareness',
      platform: platforms.includes('LinkedIn') && platforms.length === 1 ? 'LinkedIn' : 'Meta',
      format: 'Single image + carousel',
      audience: row.audience || 'Your ideal customers nearby',
      schedule: 'Daily 8-10am',
      budget: budgetLabel ? `Organic boosted ${budgetLabel}` : 'Organic',
      tone: row.tone || 'Warm, local, inviting',
    },
    posts: [
      {
        id: `${row.id}-p1`,
        image: DEMO_IMAGES[index % DEMO_IMAGES.length],
        caption: `${title} — Freya draft caption…`,
      },
    ],
  }
}

type ApiLead = {
  id: string
  name: string
  company?: string | null
  phone?: string | null
  email?: string | null
  stage?: string | null
  temperature?: string | null
  source?: string | null
  notes?: string | null
  created_at?: string | null
  lead_tags?: { tag: string }[] | null
}

function asLeadStage(value: unknown): LeadStage {
  const s = String(value ?? 'new').trim()
  return s || 'new'
}

function asLeadTemp(value: unknown): LeadTemp {
  const s = String(value ?? 'warm')
  if (s === 'hot' || s === 'cold') return s
  return 'warm'
}

function asLeadSource(value: unknown): LeadSource {
  const s = String(value ?? 'manual')
  if (s === 'campaign' || s === 'freya-found' || s === 'inbox' || s === 'manual') return s
  return 'manual'
}

function asLeadPlatform(value: unknown): LeadPlatform {
  const s = String(value ?? 'other').toLowerCase()
  if (s.includes('insta')) return 'instagram'
  if (s.includes('whats')) return 'whatsapp'
  if (s.includes('face')) return 'facebook'
  if (s.includes('mess')) return 'messenger'
  return 'other'
}

export function mapApiLead(row: ApiLead, index = 0): Lead {
  return {
    id: row.id,
    name: row.name || 'Lead',
    email: row.email || '',
    company: row.company || '—',
    note: row.notes || '',
    stage: asLeadStage(row.stage),
    temp: asLeadTemp(row.temperature),
    source: asLeadSource(row.source),
    platform: asLeadPlatform(row.source),
    tags: (row.lead_tags ?? []).map((t) => t.tag).filter(Boolean),
    color: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
    createdAt: (row.created_at ?? new Date().toISOString()).slice(0, 10),
  }
}

type ApiCrmDeal = {
  id: string
  title: string
  stage?: string | null
  value_bdt?: number | null
  next_step?: string | null
  company_id?: string | null
  contact_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type ApiCrmContact = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  role?: string | null
  company_id?: string | null
  created_at?: string | null
}

type ApiCrmCompany = {
  id: string
  name: string
  industry?: string | null
  created_at?: string | null
}

type ApiCrmActivityRow = {
  id: string
  deal_id?: string | null
  contact_id?: string | null
  kind?: string | null
  title: string
  due_at?: string | null
  completed?: boolean | null
  created_at?: string | null
}

type ApiCrmInsight = {
  id: string
  body: string
  meta?: Record<string, unknown> | null
  created_at?: string | null
}

export function mapApiCrmDeal(
  row: ApiCrmDeal,
  lookups?: { companies?: CrmCompany[]; contacts?: CrmContact[] },
): CrmDeal {
  const company = lookups?.companies?.find((c) => c.id === row.company_id)
  const contact = lookups?.contacts?.find((c) => c.id === row.contact_id)
  return {
    id: row.id,
    title: row.title || 'Deal',
    companyId: row.company_id ?? null,
    company: company?.name || '—',
    contactId: row.contact_id ?? null,
    contact: contact?.name || '—',
    email: contact?.email || '',
    phone: contact?.phone || '',
    value: Number(row.value_bdt ?? 0),
    stage: normalizeStage(String(row.stage ?? 'qualified')),
    priority: 'medium',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    closeDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    source: 'API',
    product: 'Custom',
    lastActivity: formatRelativeTime(row.updated_at ?? row.created_at),
    nextStep: row.next_step || 'Follow up',
    note: '',
    createdAt: (row.created_at ?? new Date().toISOString()).slice(0, 10),
    competitors: '—',
    decisionMaker: contact?.name || '—',
  }
}

export function mapApiCrmContact(row: ApiCrmContact, companyName?: string): CrmContact {
  return {
    id: row.id,
    name: row.name || 'Contact',
    email: row.email || '',
    phone: row.phone || '',
    title: row.role || '',
    companyId: row.company_id ?? null,
    companyName: companyName || '—',
    segment: 'b2b' as CrmSegment,
    status: 'lead',
    tags: ['Prospect'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'API',
    lifetimeValue: 0,
    lastTouch: formatRelativeTime(row.created_at),
    nextStep: 'Send hello',
    city: '',
    notes: '',
    color: '#3b82f6',
  }
}

export function mapApiCrmCompany(row: ApiCrmCompany): CrmCompany {
  return {
    id: row.id,
    name: row.name || 'Company',
    domain: '',
    industry: row.industry || 'Other',
    size: '1–10',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    annualPotential: 0,
    city: '',
    status: 'prospect',
    tags: ['Prospect'],
    nextStep: 'Find decision maker',
    lastTouch: formatRelativeTime(row.created_at),
    notes: '',
    color: '#6366f1',
  }
}

function asActivityType(value: unknown): ActivityType {
  const s = String(value ?? 'task')
  if (s === 'call' || s === 'email' || s === 'meeting' || s === 'note' || s === 'task') return s
  return 'task'
}

export function mapApiCrmActivity(row: ApiCrmActivityRow): CrmActivity {
  return {
    id: row.id,
    type: asActivityType(row.kind),
    title: row.title || 'Task',
    relatedType: row.deal_id ? 'deal' : row.contact_id ? 'contact' : 'deal',
    relatedId: row.deal_id || row.contact_id || '',
    relatedLabel: '',
    dueDate: row.due_at ? String(row.due_at).slice(0, 10) : '',
    done: Boolean(row.completed),
    owner: 'Freya',
    freyaDrafted: false,
    segment: 'b2b',
    notes: '',
  }
}

export function mapApiCrmInsight(row: ApiCrmInsight): FreyaInsight {
  const meta = row.meta ?? {}
  return {
    id: row.id,
    tone: (typeof meta.tone === 'string' ? meta.tone : 'info') as InsightTone,
    title: typeof meta.title === 'string' ? meta.title : 'Freya tip',
    body: row.body,
    actionLabel: typeof meta.actionLabel === 'string' ? meta.actionLabel : 'View',
    segment: 'both',
  }
}

type ApiMoneyLine = {
  id?: string
  description?: string | null
  qty?: number | null
  unit_bdt?: number | null
}

type ApiInvoice = {
  id: string
  number?: string | null
  party_id?: string | null
  status?: string | null
  total_bdt?: number | null
  due_at?: string | null
  paid_at?: string | null
  notes?: string | null
  created_at?: string | null
  money_invoice_lines?: ApiMoneyLine[] | null
}

type ApiBill = {
  id: string
  number?: string | null
  party_id?: string | null
  status?: string | null
  total_bdt?: number | null
  due_at?: string | null
  paid_at?: string | null
  created_at?: string | null
  money_bill_lines?: ApiMoneyLine[] | null
}

type ApiExpense = {
  id: string
  description?: string | null
  amount_bdt?: number | null
  category?: string | null
  spent_at?: string | null
  payment_method?: string | null
  created_at?: string | null
}

type ApiAccount = {
  id: string
  name: string
  kind?: string | null
  balance_bdt?: number | null
}

type ApiParty = {
  id: string
  name: string
  kind?: string | null
  phone?: string | null
  email?: string | null
}

function mapMoneyLines(lines: ApiMoneyLine[] | null | undefined, fallbackTotal = 0): LineItem[] {
  if (lines?.length) {
    return lines.map((l, i) => ({
      id: l.id || `li-${i}`,
      description: l.description || 'Line',
      qty: Number(l.qty ?? 1),
      unitPrice: Number(l.unit_bdt ?? 0),
    }))
  }
  if (fallbackTotal > 0) {
    return [{ id: 'li-1', description: 'Total', qty: 1, unitPrice: fallbackTotal }]
  }
  return []
}

function asInvoiceStatus(value: unknown): InvoiceStatus {
  const s = String(value ?? 'draft')
  if (
    s === 'sent' ||
    s === 'viewed' ||
    s === 'partial' ||
    s === 'paid' ||
    s === 'overdue' ||
    s === 'void' ||
    s === 'draft'
  ) {
    return s
  }
  return 'draft'
}

function asBillStatus(value: unknown): BillStatus {
  const s = String(value ?? 'awaiting')
  if (s === 'open' || s === 'awaiting') return 'awaiting'
  if (s === 'paid' || s === 'overdue' || s === 'draft' || s === 'scheduled') return s as BillStatus
  return 'awaiting'
}

export function mapApiInvoice(row: ApiInvoice, partyName?: string): Invoice {
  const total = Number(row.total_bdt ?? 0)
  const status = asInvoiceStatus(row.status)
  const items = mapMoneyLines(row.money_invoice_lines, total)
  return {
    id: row.id,
    number: row.number || `INV-${row.id.slice(0, 6)}`,
    customerId: row.party_id || '',
    customerName: partyName || 'Customer',
    status,
    issueDate: (row.created_at ?? new Date().toISOString()).slice(0, 10),
    dueDate: row.due_at ? String(row.due_at).slice(0, 10) : '',
    paidDate: row.paid_at ? String(row.paid_at).slice(0, 10) : undefined,
    currency: 'BDT',
    items,
    amountPaid: status === 'paid' ? total : 0,
    notes: row.notes || '',
    freyaDrafted: false,
    reminderSent: false,
  }
}

export function mapApiBill(row: ApiBill, partyName?: string): Bill {
  const total = Number(row.total_bdt ?? 0)
  const status = asBillStatus(row.status)
  return {
    id: row.id,
    number: row.number || `BILL-${row.id.slice(0, 6)}`,
    vendorId: row.party_id || '',
    vendorName: partyName || 'Vendor',
    status,
    issueDate: (row.created_at ?? new Date().toISOString()).slice(0, 10),
    dueDate: row.due_at ? String(row.due_at).slice(0, 10) : '',
    paidDate: row.paid_at ? String(row.paid_at).slice(0, 10) : undefined,
    category: 'Other' as ExpenseCategory,
    items: mapMoneyLines(row.money_bill_lines, total),
    amountPaid: status === 'paid' ? total : 0,
    notes: '',
    freyaFlagged: false,
  }
}

function asExpenseCategory(value: unknown): ExpenseCategory {
  const s = String(value ?? 'Other')
  return (s || 'Other') as ExpenseCategory
}

export function mapApiExpense(row: ApiExpense): Expense {
  const category = asExpenseCategory(row.category)
  return {
    id: row.id,
    merchant: row.description || 'Expense',
    date: row.spent_at ? String(row.spent_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    amount: Number(row.amount_bdt ?? 0),
    category,
    status: 'approved' as ExpenseStatus,
    accountId: '',
    receipt: false,
    notes: '',
    freyaSuggestedCategory: category,
    submittedBy: 'You',
  }
}

export function mapApiAccount(row: ApiAccount): BankAccount {
  const kind = String(row.kind ?? 'cash').toLowerCase()
  return {
    id: row.id,
    name: row.name || 'Cash',
    institution: kind === 'bkash' || kind === 'nagad' ? kind : 'Manual',
    type: kind === 'card' ? 'card' : 'checking',
    currency: 'BDT',
    balance: Number(row.balance_bdt ?? 0),
    lastSynced: 'Just now',
    color: '#0284c7',
  }
}

type ApiTransaction = {
  id: string
  account_id?: string | null
  amount_bdt?: number | null
  direction?: string | null
  memo?: string | null
  txn_date?: string | null
  status?: string | null
  category?: string | null
  matched_type?: string | null
  matched_ref?: string | null
  matched_label?: string | null
  freya_match_confidence?: number | null
  invoice_id?: string | null
  created_at?: string | null
}

function asTxnStatus(value: unknown): TxnStatus {
  const s = String(value ?? 'unmatched')
  if (s === 'matched' || s === 'reconciled' || s === 'excluded') return s
  return 'unmatched'
}

export function mapApiTransaction(row: ApiTransaction): BankTransaction {
  const direction = (row.direction === 'out' ? 'out' : 'in') as TxnDirection
  const matchedTo =
    row.matched_type && row.matched_ref
      ? {
          type: (row.matched_type === 'invoice' || row.matched_type === 'bill'
            ? row.matched_type
            : 'expense') as 'invoice' | 'bill' | 'expense',
          id: row.matched_ref,
          label: row.matched_label || 'Matched',
        }
      : undefined
  return {
    id: row.id,
    accountId: row.account_id || '',
    date: (row.txn_date ?? row.created_at ?? new Date().toISOString()).slice(0, 10),
    description: row.memo || 'Transaction',
    amount: Number(row.amount_bdt ?? 0),
    direction,
    status: asTxnStatus(row.status),
    category: (row.category as BankTransaction['category']) ?? undefined,
    matchedTo,
    freyaMatchConfidence: row.freya_match_confidence ?? undefined,
  }
}

type ApiLedgerAccount = {
  id: string
  code: string
  name: string
  type?: string | null
  balance_bdt?: number | null
  budget_monthly_bdt?: number | null
  watchlist?: boolean | null
}

function asAccountType(value: unknown): AccountType {
  const s = String(value ?? 'expense')
  if (s === 'asset' || s === 'liability' || s === 'income' || s === 'equity') return s
  return 'expense'
}

export function mapApiLedgerAccount(row: ApiLedgerAccount): LedgerAccount {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: asAccountType(row.type),
    balance: Number(row.balance_bdt ?? 0),
    budgetMonthly: row.budget_monthly_bdt != null ? Number(row.budget_monthly_bdt) : undefined,
    watchlist: Boolean(row.watchlist),
  }
}

type ApiCashflow = {
  id: string
  month: string
  cash_in_bdt?: number | null
  cash_out_bdt?: number | null
}

export function mapApiCashflow(row: ApiCashflow): CashMonth {
  return {
    month: row.month,
    cashIn: Number(row.cash_in_bdt ?? 0),
    cashOut: Number(row.cash_out_bdt ?? 0),
  }
}

export function mapApiParty(row: ApiParty): MoneyParty {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind === 'vendor' ? 'vendor' : 'customer',
    email: row.email || '',
    phone: row.phone || '',
    balance: 0,
    tags: [],
    notes: '',
    color: '#0284c7',
    lastActivity: '—',
  }
}

type ApiDiscoverSignal = {
  id: string
  title: string
  body?: string | null
  status?: string | null
  meta?: Record<string, unknown> | null
  created_at?: string | null
}

type ApiContentIdea = {
  id: string
  title: string
  caption?: string | null
  status?: string | null
  created_at?: string | null
}

type ApiDiscoverInsight = {
  id: string
  body: string
  created_at?: string | null
}

function asSignalStatus(value: unknown): DiscoverSignal['status'] {
  const s = String(value ?? 'new')
  if (s === 'saved' || s === 'converted' || s === 'dismissed') return s
  return 'new'
}

export function mapApiDiscoverSignal(row: ApiDiscoverSignal): DiscoverSignal {
  const meta = row.meta ?? {}
  return {
    id: row.id,
    headline: row.title,
    date: formatRelativeTime(row.created_at),
    type: (typeof meta.type === 'string' ? meta.type : 'Mention') as SignalType,
    platform: (typeof meta.platform === 'string' ? meta.platform : 'local') as SignalPlatform,
    strength: (typeof meta.strength === 'string' ? meta.strength : 'medium') as SignalStrength,
    whyItMatters: row.body || '',
    freyaSuggestion:
      typeof meta.suggestion === 'string'
        ? meta.suggestion
        : 'Save this or convert to a lead / post idea.',
    action: (typeof meta.action === 'string' ? meta.action : 'content') as SignalAction,
    status: asSignalStatus(row.status),
  }
}

export function mapApiContentIdea(row: ApiContentIdea): ContentIdea {
  const status = String(row.status ?? 'saved')
  return {
    id: row.id,
    title: row.title,
    angle: row.caption || '',
    format: 'Feed post',
    channel: 'Instagram',
    status: status === 'used' ? 'used' : status === 'suggested' ? 'suggested' : 'saved',
  }
}

export function mapApiDiscoverInsight(row: ApiDiscoverInsight): DiscoverInsight {
  return {
    id: row.id,
    tone: 'info',
    title: 'Freya insight',
    body: row.body,
  }
}

type ApiDiscoverTrend = {
  id: string
  title: string
  summary?: string | null
  direction?: string | null
  change_label?: string | null
  topic?: string | null
  freya_tip?: string | null
}

export function mapApiDiscoverTrend(row: ApiDiscoverTrend): DiscoverTrend {
  const direction = (row.direction === 'steady' || row.direction === 'emerging'
    ? row.direction
    : 'up') as TrendDirection
  return {
    id: row.id,
    title: row.title,
    summary: row.summary || '',
    direction,
    changeLabel: row.change_label || '',
    topic: row.topic || 'Trend',
    freyaTip: row.freya_tip || '',
  }
}

type ApiCompetitorWatch = {
  id: string
  name: string
  notes?: string | null
  last_move?: string | null
  threat?: string | null
  freya_take?: string | null
}

export function mapApiCompetitorWatch(row: ApiCompetitorWatch): CompetitorWatch {
  const threat = (row.threat === 'high' || row.threat === 'medium'
    ? row.threat
    : 'low') as CompetitorWatch['threat']
  return {
    id: row.id,
    name: row.name,
    note: row.notes || '',
    lastMove: row.last_move || '',
    threat,
    freyaTake: row.freya_take || '',
  }
}
