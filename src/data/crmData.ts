import { DEFAULT_CRM_STAGES } from './funnelStages'

export type CrmSegment = 'b2b' | 'b2c'
export type DealStage = string
export type DealPriority = 'high' | 'medium' | 'low'
export type ContactStatus = 'active' | 'lead' | 'customer' | 'churned'
export type ActivityType = 'task' | 'call' | 'email' | 'meeting' | 'note'
export type InsightTone = 'action' | 'risk' | 'win' | 'info'

/** Default catalog — prefer `useFunnelStages().crmStages` for org-custom steps. */
export const DEAL_STAGES: {
  id: DealStage
  label: string
  statusColor: string
  probability: number
  isClosed?: boolean
}[] = DEFAULT_CRM_STAGES.map((s) => ({
  id: s.key,
  label: s.label,
  statusColor: s.color,
  probability: s.probability ?? 0,
  isClosed: s.isClosed,
}))

export function stageMeta(id: string) {
  return DEAL_STAGES.find((s) => s.id === id) ?? DEAL_STAGES[0]
}

const STAGE_ALIASES: Record<string, string> = {
  discovery: 'qualified',
  presentation: 'proposal',
  'closed-won': 'won',
  'closed-lost': 'lost',
}

export function normalizeStage(raw: string): DealStage {
  if (DEAL_STAGES.some((s) => s.id === raw)) return raw
  return STAGE_ALIASES[raw] || raw || 'qualified'
}


export interface CrmContact {
  id: string
  name: string
  email: string
  phone: string
  title: string
  companyId: string | null
  companyName: string
  segment: CrmSegment
  status: ContactStatus
  tags: string[]
  owner: string
  ownerColor: string
  source: string
  lifetimeValue: number
  lastTouch: string
  nextStep: string
  city: string
  notes: string
  color: string
}

export interface CrmCompany {
  id: string
  name: string
  domain: string
  industry: string
  size: string
  segment: CrmSegment
  owner: string
  ownerColor: string
  annualPotential: number
  city: string
  status: 'prospect' | 'customer' | 'partner'
  tags: string[]
  nextStep: string
  lastTouch: string
  notes: string
  color: string
}

export interface CrmDeal {
  id: string
  title: string
  companyId: string | null
  company: string
  contactId: string | null
  contact: string
  email: string
  phone: string
  value: number
  stage: DealStage
  priority: DealPriority
  segment: CrmSegment
  owner: string
  ownerColor: string
  closeDate: string
  source: string
  product: string
  lastActivity: string
  nextStep: string
  note: string
  createdAt: string
  competitors: string
  decisionMaker: string
}

export interface CrmActivity {
  id: string
  type: ActivityType
  title: string
  relatedType: 'deal' | 'contact' | 'company'
  relatedId: string
  relatedLabel: string
  dueDate: string
  done: boolean
  owner: string
  freyaDrafted: boolean
  segment: CrmSegment
  notes: string
}

export interface FreyaInsight {
  id: string
  tone: InsightTone
  title: string
  body: string
  actionLabel: string
  relatedType?: 'deal' | 'contact' | 'company' | 'activity'
  relatedId?: string
  segment: CrmSegment | 'both'
}

export const SEED_COMPANIES: CrmCompany[] = [
  {
    id: 'co1',
    name: 'Horizon Chambers',
    domain: 'horizonchambers.bd',
    industry: 'Legal',
    size: '50–200',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    annualPotential: 420000,
    city: 'Gulshan',
    status: 'prospect',
    tags: ['Corporate', 'Recurring'],
    nextStep: 'Send weekly festive-pack proposal',
    lastTouch: 'Email · 2 days ago',
    notes: 'Interested in standing Tuesday gift packs for the office.',
    color: '#3b82f6',
  },
  {
    id: 'co2',
    name: 'Petal Events',
    domain: 'petalevents.bd',
    industry: 'Events',
    size: '11–50',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    annualPotential: 280000,
    city: 'Banani',
    status: 'prospect',
    tags: ['Bridal', 'Events'],
    nextStep: 'Follow up after fitting',
    lastTouch: 'Meeting · Today',
    notes: 'Plans 8–12 weddings per season — strong referral partner.',
    color: '#f97316',
  },
  {
    id: 'co3',
    name: 'Rahman Traders',
    domain: 'rahmantraders.bd',
    industry: 'Retail',
    size: '11–50',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    annualPotential: 650000,
    city: 'Gulshan',
    status: 'prospect',
    tags: ['Wholesale'],
    nextStep: 'Await sample feedback',
    lastTouch: 'Email · 1 day ago',
    notes: 'Wants daily kurti wholesale starting September.',
    color: '#f59e0b',
  },
  {
    id: 'co4',
    name: 'Dhaka Chamber',
    domain: 'dhakachamber.org',
    industry: 'Nonprofit',
    size: '11–50',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    annualPotential: 180000,
    city: 'Motijheel',
    status: 'customer',
    tags: ['Events', 'Visibility'],
    nextStep: 'Send annual reception contract',
    lastTouch: 'Email · 4 hours ago',
    notes: 'Flagship annual reception — high brand visibility.',
    color: '#0f766e',
  },
  {
    id: 'co5',
    name: 'Mehta Weddings',
    domain: 'mehtaweddings.bd',
    industry: 'Events',
    size: '1–10',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    annualPotential: 140000,
    city: 'Dhanmondi',
    status: 'customer',
    tags: ['Bridal', 'Repeat'],
    nextStep: 'Add September lehenga to production',
    lastTouch: 'Won · Jun 20',
    notes: 'Closed September bridal lehenga — deposit paid.',
    color: '#be185d',
  },
]

export const SEED_CONTACTS: CrmContact[] = [
  {
    id: 'ct1',
    name: 'Farhana Rahman',
    email: 'farhana@horizonchambers.bd',
    phone: '+880 1711 555142',
    title: 'Office Manager',
    companyId: 'co1',
    companyName: 'Horizon Chambers',
    segment: 'b2b',
    status: 'lead',
    tags: ['Decision maker', 'Corporate'],
    owner: 'Joy',
    ownerColor: '#64748b',
    source: 'Inbox',
    lifetimeValue: 0,
    lastTouch: 'Email · 2 days ago',
    nextStep: 'Book fitting for the team',
    city: 'Gulshan',
    notes: 'Wants reliable Tuesday mornings — budget approved in principle.',
    color: '#3b82f6',
  },
  {
    id: 'ct2',
    name: 'Priya Patel',
    email: 'priya@petalevents.bd',
    phone: '+880 1812 555166',
    title: 'Founder',
    companyId: 'co2',
    companyName: 'Petal Events',
    segment: 'b2b',
    status: 'lead',
    tags: ['Bridal', 'Champion'],
    owner: 'Joy',
    ownerColor: '#64748b',
    source: 'Inbox',
    lifetimeValue: 45000,
    lastTouch: 'Meeting · Today',
    nextStep: 'Send proposal PDF',
    city: 'Banani',
    notes: '80-guest wedding — fitting went well.',
    color: '#f97316',
  },
  {
    id: 'ct3',
    name: 'Karim Rahman',
    email: 'karim@rahmantraders.bd',
    phone: '+880 1713 555133',
    title: 'Owner',
    companyId: 'co3',
    companyName: 'Rahman Traders',
    segment: 'b2b',
    status: 'lead',
    tags: ['Wholesale'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'Freya-found',
    lifetimeValue: 0,
    lastTouch: 'Email · 1 day ago',
    nextStep: 'Confirm wholesale pricing',
    city: 'Gulshan',
    notes: 'Needs 40 kurtis weekly, Sat–Thu.',
    color: '#f59e0b',
  },
  {
    id: 'ct4',
    name: 'Maya Ahmed',
    email: 'maya.ahmed@gmail.com',
    phone: '+880 1911 555201',
    title: '',
    companyId: null,
    companyName: '—',
    segment: 'b2c',
    status: 'customer',
    tags: ['Repeat', 'Birthday'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'Instagram',
    lifetimeValue: 18500,
    lastTouch: 'Order · 5 days ago',
    nextStep: 'Offer loyalty stamp card',
    city: 'Dhanmondi',
    notes: 'Orders custom sarees for family birthdays twice a year.',
    color: '#ec4899',
  },
  {
    id: 'ct5',
    name: 'Rafi Islam',
    email: 'rafi.islam@outlook.com',
    phone: '+880 1615 555208',
    title: '',
    companyId: null,
    companyName: '—',
    segment: 'b2c',
    status: 'customer',
    tags: ['Local', 'Weekend regular'],
    owner: 'Joy',
    ownerColor: '#64748b',
    source: 'Walk-in',
    lifetimeValue: 9200,
    lastTouch: 'Visit · Yesterday',
    nextStep: 'Invite to Saturday styling club',
    city: 'Dhanmondi',
    notes: 'Kurti regular — brings friends on weekends.',
    color: '#14b8a6',
  },
  {
    id: 'ct6',
    name: 'Nadia Hasan',
    email: 'nadia@hasanstudio.bd',
    phone: '+880 1718 555188',
    title: 'Producer',
    companyId: null,
    companyName: 'Hasan Studio',
    segment: 'b2b',
    status: 'lead',
    tags: ['Photoshoot', 'Custom'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'Inbox',
    lifetimeValue: 0,
    lastTouch: 'Task due · Tomorrow',
    nextStep: 'Revise wardrobe-box pricing',
    city: 'Banani',
    notes: 'Needs custom sarees for client shoot days.',
    color: '#f97316',
  },
  {
    id: 'ct7',
    name: 'Aisha Khan',
    email: 'aisha@khanstudio.bd',
    phone: '+880 1815 555155',
    title: 'Creative Director',
    companyId: null,
    companyName: 'Khan Studio',
    segment: 'b2b',
    status: 'customer',
    tags: ['Repeat', 'Subscription'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'Freya-found',
    lifetimeValue: 12500,
    lastTouch: 'Won · Jun 28',
    nextStep: 'Confirm August box colours',
    city: 'Gulshan',
    notes: 'Monthly styling box subscriber.',
    color: '#1e40af',
  },
  {
    id: 'ct8',
    name: 'Tania Chowdhury',
    email: 'tania.chowdhury@icloud.com',
    phone: '+880 1912 555222',
    title: '',
    companyId: null,
    companyName: '—',
    segment: 'b2c',
    status: 'lead',
    tags: ['Custom Order', 'Bridal'],
    owner: 'Joy',
    ownerColor: '#64748b',
    source: 'Facebook',
    lifetimeValue: 0,
    lastTouch: 'DM · 3 days ago',
    nextStep: 'Schedule lehenga consultation',
    city: 'Mirpur',
    notes: 'Asked about engagement-party guest favours.',
    color: '#0ea5e9',
  },
]

export const SEED_DEALS: CrmDeal[] = [
  {
    id: 'd1',
    title: 'Corporate gift packs — 40 pax',
    companyId: 'co1',
    company: 'Horizon Chambers',
    contactId: 'ct1',
    contact: 'Farhana Rahman',
    email: 'farhana@horizonchambers.bd',
    phone: '+880 1711 555142',
    value: 85000,
    stage: 'qualified',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-07-28',
    source: 'Inbox',
    product: 'Corporate gifting',
    lastActivity: 'Email · 2 days ago',
    nextStep: 'Send sample pack menu',
    note: 'Weekly standing order interest — first fitting booked.',
    createdAt: '2026-07-10',
    competitors: 'Local gift retailer',
    decisionMaker: 'Farhana Rahman',
  },
  {
    id: 'd2',
    title: 'Film-day wardrobe boxes',
    companyId: null,
    company: 'Hossain Films',
    contactId: null,
    contact: 'Karim Hossain',
    email: 'karim@hossainfilms.bd',
    phone: '+880 1719 555198',
    value: 45000,
    stage: 'qualified',
    priority: 'medium',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    closeDate: '2026-08-05',
    source: 'Campaign',
    product: 'Wardrobe boxes',
    lastActivity: 'Call · Yesterday',
    nextStep: 'Confirm shoot dates',
    note: '3-day shoot — kurtis, dupattas + accessories.',
    createdAt: '2026-07-12',
    competitors: '—',
    decisionMaker: 'Karim Hossain',
  },
  {
    id: 'd3',
    title: 'Engagement guest favours',
    companyId: null,
    company: '—',
    contactId: 'ct8',
    contact: 'Tania Chowdhury',
    email: 'tania.chowdhury@icloud.com',
    phone: '+880 1912 555222',
    value: 22000,
    stage: 'qualified',
    priority: 'medium',
    segment: 'b2c',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-08-02',
    source: 'Facebook',
    product: 'Custom guest favours',
    lastActivity: 'DM · 3 days ago',
    nextStep: 'Schedule consultation',
    note: 'B2C custom order — engagement party for 30 guests.',
    createdAt: '2026-07-13',
    competitors: 'Home makers',
    decisionMaker: 'Tania Chowdhury',
  },
  {
    id: 'd4',
    title: 'Bridal lehenga package',
    companyId: 'co2',
    company: 'Petal Events',
    contactId: 'ct2',
    contact: 'Priya Patel',
    email: 'priya@petalevents.bd',
    phone: '+880 1812 555166',
    value: 95000,
    stage: 'meeting',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-07-22',
    source: 'Inbox',
    product: 'Bridal lehenga',
    lastActivity: 'Meeting · Today',
    nextStep: 'Send proposal PDF',
    note: '80 guests — fitting scheduled for Thursday.',
    createdAt: '2026-07-05',
    competitors: 'Two Banani boutiques',
    decisionMaker: 'Priya Patel',
  },
  {
    id: 'd5',
    title: 'Birthday saree — Maya',
    companyId: null,
    company: '—',
    contactId: 'ct4',
    contact: 'Maya Ahmed',
    email: 'maya.ahmed@gmail.com',
    phone: '+880 1911 555201',
    value: 8500,
    stage: 'meeting',
    priority: 'low',
    segment: 'b2c',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    closeDate: '2026-07-20',
    source: 'Instagram',
    product: 'Custom saree',
    lastActivity: 'Chat · Today',
    nextStep: 'Confirm colour + pickup',
    note: 'Daughter’s birthday — jewel-tone theme requested.',
    createdAt: '2026-07-14',
    competitors: '—',
    decisionMaker: 'Maya Ahmed',
  },
  {
    id: 'd6',
    title: 'Shop wholesale kurtis',
    companyId: 'co3',
    company: 'Rahman Traders',
    contactId: 'ct3',
    contact: 'Karim Rahman',
    email: 'karim@rahmantraders.bd',
    phone: '+880 1713 555133',
    value: 120000,
    stage: 'proposal',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-08-10',
    source: 'Freya-found',
    product: 'Wholesale kurtis',
    lastActivity: 'Email · 1 day ago',
    nextStep: 'Await sample feedback',
    note: 'Weekly wholesale — sample batch delivered.',
    createdAt: '2026-06-28',
    competitors: 'Gulshan garments wholesaler',
    decisionMaker: 'Karim Rahman',
  },
  {
    id: 'd7',
    title: 'Photoshoot wardrobe day',
    companyId: null,
    company: 'Hasan Studio',
    contactId: 'ct6',
    contact: 'Nadia Hasan',
    email: 'nadia@hasanstudio.bd',
    phone: '+880 1718 555188',
    value: 35000,
    stage: 'proposal',
    priority: 'medium',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    closeDate: '2026-07-30',
    source: 'Inbox',
    product: 'Photoshoot wardrobe',
    lastActivity: 'Task due · Tomorrow',
    nextStep: 'Revise wardrobe-box pricing',
    note: 'Client shoot day — proposal with 3 package options.',
    createdAt: '2026-07-01',
    competitors: 'Banani custom boutique',
    decisionMaker: 'Nadia Hasan',
  },
  {
    id: 'd8',
    title: 'Book launch reception',
    companyId: null,
    company: 'Becker Books',
    contactId: null,
    contact: 'Tom Becker',
    email: 'tom@beckerbooks.bd',
    phone: '+880 1712 555122',
    value: 48000,
    stage: 'negotiation',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-07-25',
    source: 'Campaign',
    product: 'Event guest favours',
    lastActivity: 'Call · Today',
    nextStep: 'Confirm deposit terms',
    note: 'Budget locked — negotiating delivery window.',
    createdAt: '2026-06-20',
    competitors: 'Hotel gift desk',
    decisionMaker: 'Tom Becker',
  },
  {
    id: 'd9',
    title: 'Chamber reception dressing',
    companyId: 'co4',
    company: 'Dhaka Chamber',
    contactId: null,
    contact: 'Nora Ahmed',
    email: 'nora@dhakachamber.org',
    phone: '+880 1710 555100',
    value: 150000,
    stage: 'negotiation',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-08-15',
    source: 'Referral',
    product: 'Large event wardrobe',
    lastActivity: 'Email · 4 hours ago',
    nextStep: 'Send contract',
    note: 'Annual reception — final headcount ~120.',
    createdAt: '2026-06-15',
    competitors: 'Hotel boutique',
    decisionMaker: 'Nora Ahmed',
  },
  {
    id: 'd10',
    title: 'Monthly styling box',
    companyId: null,
    company: 'Khan Studio',
    contactId: 'ct7',
    contact: 'Aisha Khan',
    email: 'aisha@khanstudio.bd',
    phone: '+880 1815 555155',
    value: 4500,
    stage: 'won',
    priority: 'low',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    closeDate: '2026-06-28',
    source: 'Freya-found',
    product: 'Subscription box',
    lastActivity: 'Won · Jun 28',
    nextStep: 'Schedule first delivery',
    note: 'Recurring monthly box — deposit received.',
    createdAt: '2026-06-10',
    competitors: '—',
    decisionMaker: 'Aisha Khan',
  },
  {
    id: 'd11',
    title: 'September bridal lehenga',
    companyId: 'co5',
    company: 'Mehta Weddings',
    contactId: null,
    contact: 'Raj Mehta',
    email: 'raj@mehtaweddings.bd',
    phone: '+880 1719 555199',
    value: 125000,
    stage: 'won',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-06-20',
    source: 'Campaign',
    product: 'Bridal lehenga',
    lastActivity: 'Won · Jun 20',
    nextStep: 'Add to production calendar',
    note: 'Deposit paid — September wedding locked.',
    createdAt: '2026-06-01',
    competitors: '—',
    decisionMaker: 'Raj Mehta',
  },
  {
    id: 'd12',
    title: 'Weekend styling club signup',
    companyId: null,
    company: '—',
    contactId: 'ct5',
    contact: 'Rafi Islam',
    email: 'rafi.islam@outlook.com',
    phone: '+880 1615 555208',
    value: 1200,
    stage: 'won',
    priority: 'low',
    segment: 'b2c',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-07-12',
    source: 'Walk-in',
    product: 'Loyalty / club',
    lastActivity: 'Won · Jul 12',
    nextStep: 'Send club welcome SMS',
    note: 'Joined Ramadan pre-order club — ৳1,200/month.',
    createdAt: '2026-07-12',
    competitors: '—',
    decisionMaker: 'Rafi Islam',
  },
]

export const SEED_ACTIVITIES: CrmActivity[] = [
  {
    id: 'a1',
    type: 'task',
    title: 'Send sample pack menu to Farhana Rahman',
    relatedType: 'deal',
    relatedId: 'd1',
    relatedLabel: 'Corporate gift packs — 40 pax',
    dueDate: '2026-07-17',
    done: false,
    owner: 'Joy',
    freyaDrafted: true,
    segment: 'b2b',
    notes: 'Freya drafted a warm email with 3 package options.',
  },
  {
    id: 'a2',
    type: 'meeting',
    title: 'Bridal fitting with Priya',
    relatedType: 'deal',
    relatedId: 'd4',
    relatedLabel: 'Bridal lehenga package',
    dueDate: '2026-07-16',
    done: false,
    owner: 'Joy',
    freyaDrafted: false,
    segment: 'b2b',
    notes: 'In-shop fitting — jewel-tone + soft pastel options.',
  },
  {
    id: 'a3',
    type: 'call',
    title: 'Confirm shoot dates with Karim',
    relatedType: 'deal',
    relatedId: 'd2',
    relatedLabel: 'Film-day wardrobe boxes',
    dueDate: '2026-07-17',
    done: false,
    owner: 'Freya',
    freyaDrafted: true,
    segment: 'b2b',
    notes: 'Freya prepared call script + pricing sheet.',
  },
  {
    id: 'a4',
    type: 'email',
    title: 'Loyalty invite to Rafi Islam',
    relatedType: 'contact',
    relatedId: 'ct5',
    relatedLabel: 'Rafi Islam',
    dueDate: '2026-07-18',
    done: false,
    owner: 'Freya',
    freyaDrafted: true,
    segment: 'b2c',
    notes: 'B2C nurture — weekend styling club upsell.',
  },
  {
    id: 'a5',
    type: 'task',
    title: 'Revise wardrobe pricing for Nadia',
    relatedType: 'deal',
    relatedId: 'd7',
    relatedLabel: 'Photoshoot wardrobe day',
    dueDate: '2026-07-17',
    done: false,
    owner: 'Freya',
    freyaDrafted: true,
    segment: 'b2b',
    notes: 'Competitor is undercutting — Freya suggests value-add bundle.',
  },
  {
    id: 'a6',
    type: 'note',
    title: 'Chamber wants branded ribbon add-on',
    relatedType: 'company',
    relatedId: 'co4',
    relatedLabel: 'Dhaka Chamber',
    dueDate: '2026-07-16',
    done: true,
    owner: 'Joy',
    freyaDrafted: false,
    segment: 'b2b',
    notes: 'Logged from call — include in contract as optional line.',
  },
  {
    id: 'a7',
    type: 'email',
    title: 'Proposal PDF to Petal Events',
    relatedType: 'deal',
    relatedId: 'd4',
    relatedLabel: 'Bridal lehenga package',
    dueDate: '2026-07-17',
    done: false,
    owner: 'Joy',
    freyaDrafted: true,
    segment: 'b2b',
    notes: 'Freya drafted proposal with tiers: Classic / Signature / Showpiece.',
  },
  {
    id: 'a8',
    type: 'task',
    title: 'Lehenga consultation with Tania Chowdhury',
    relatedType: 'contact',
    relatedId: 'ct8',
    relatedLabel: 'Tania Chowdhury',
    dueDate: '2026-07-19',
    done: false,
    owner: 'Joy',
    freyaDrafted: false,
    segment: 'b2c',
    notes: 'B2C consult — engagement party guest favours.',
  },
]

export const SEED_INSIGHTS: FreyaInsight[] = [
  {
    id: 'i1',
    tone: 'risk',
    title: 'Chamber deal is hot — contract not sent',
    body: 'Nora opened your last email twice. Deals like this that sit in Negotiation >7 days close 34% less often. I can draft the contract tonight.',
    actionLabel: 'Draft contract',
    relatedType: 'deal',
    relatedId: 'd9',
    segment: 'b2b',
  },
  {
    id: 'i2',
    tone: 'action',
    title: '3 B2C follow-ups ready',
    body: 'Maya, Rafi, and Tania all have next steps due this week. Want me to queue friendly messages in your voice?',
    actionLabel: 'Queue messages',
    relatedType: 'activity',
    relatedId: 'a4',
    segment: 'b2c',
  },
  {
    id: 'i3',
    tone: 'win',
    title: 'Wholesale path looks strong',
    body: 'Rahman Traders’ sample feedback is overdue by 1 day — but similar wholesale deals historically close at 62% once samples land. Ping Karim today.',
    actionLabel: 'Open deal',
    relatedType: 'deal',
    relatedId: 'd6',
    segment: 'b2b',
  },
  {
    id: 'i4',
    tone: 'info',
    title: 'Your mix is healthy',
    body: 'Pipeline is 78% B2B / 22% B2C by value. B2C deals close faster; B2B carries the revenue. Keep both lanes warm.',
    actionLabel: 'View overview',
    segment: 'both',
  },
  {
    id: 'i5',
    tone: 'action',
    title: 'Priya fitting is today',
    body: 'I prepped talking points: jewel tones, soft pastels, and a photographer-friendly tier. Approve and I’ll put them in your notes.',
    actionLabel: 'Show talking points',
    relatedType: 'deal',
    relatedId: 'd4',
    segment: 'b2b',
  },
]

export function formatMoney(n: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-BD', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function forecastValue(deal: CrmDeal) {
  return Math.round(deal.value * (stageMeta(deal.stage).probability / 100))
}

export function isOverdue(deal: CrmDeal) {
  if (stageMeta(deal.stage).isClosed) return false
  return deal.closeDate < new Date().toISOString().slice(0, 10)
}

export const SEGMENT_LABEL: Record<CrmSegment, string> = {
  b2b: 'Business',
  b2c: 'People',
}

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  task: 'Task',
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
}
