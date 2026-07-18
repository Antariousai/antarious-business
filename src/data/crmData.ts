export type CrmSegment = 'b2b' | 'b2c'
export type DealStage =
  | 'qualified'
  | 'meeting'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
export type DealPriority = 'high' | 'medium' | 'low'
export type ContactStatus = 'active' | 'lead' | 'customer' | 'churned'
export type ActivityType = 'task' | 'call' | 'email' | 'meeting' | 'note'
export type InsightTone = 'action' | 'risk' | 'win' | 'info'

export const DEAL_STAGES: {
  id: DealStage
  label: string
  statusColor: string
  probability: number
  isClosed?: boolean
}[] = [
  { id: 'qualified', label: 'New', statusColor: '#579bfc', probability: 20 },
  { id: 'meeting', label: 'Talking', statusColor: '#a25ddc', probability: 40 },
  { id: 'proposal', label: 'Quote sent', statusColor: '#fdab3d', probability: 60 },
  { id: 'negotiation', label: 'Almost there', statusColor: '#ff642e', probability: 80 },
  { id: 'won', label: 'Won', statusColor: '#00c875', probability: 100, isClosed: true },
  { id: 'lost', label: 'Lost', statusColor: '#c4c4c4', probability: 0, isClosed: true },
]

export function stageMeta(id: string) {
  return DEAL_STAGES.find((s) => s.id === id) ?? DEAL_STAGES[0]
}

const STAGE_ALIASES: Record<string, DealStage> = {
  discovery: 'qualified',
  presentation: 'proposal',
  'closed-won': 'won',
  'closed-lost': 'lost',
}

export function normalizeStage(raw: string): DealStage {
  if (DEAL_STAGES.some((s) => s.id === raw)) return raw as DealStage
  return STAGE_ALIASES[raw] || 'qualified'
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
    name: 'Brooks Law',
    domain: 'brookslaw.com',
    industry: 'Legal',
    size: '50–200',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    annualPotential: 28000,
    city: 'Austin',
    status: 'prospect',
    tags: ['Corporate', 'Recurring'],
    nextStep: 'Send weekly breakfast proposal',
    lastTouch: 'Email · 2 days ago',
    notes: 'Interested in standing Tuesday breakfast for the office.',
    color: '#3b82f6',
  },
  {
    id: 'co2',
    name: 'Petal Events',
    domain: 'petalevents.com',
    industry: 'Events',
    size: '11–50',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    annualPotential: 18000,
    city: 'Austin',
    status: 'prospect',
    tags: ['Wedding', 'Events'],
    nextStep: 'Follow up after tasting',
    lastTouch: 'Meeting · Today',
    notes: 'Plans 8–12 weddings per season — strong referral partner.',
    color: '#8b5cf6',
  },
  {
    id: 'co3',
    name: 'Okafor Cafe',
    domain: 'okaforcafe.com',
    industry: 'Hospitality',
    size: '11–50',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    annualPotential: 42000,
    city: 'Round Rock',
    status: 'prospect',
    tags: ['Wholesale'],
    nextStep: 'Await sample feedback',
    lastTouch: 'Email · 1 day ago',
    notes: 'Wants daily croissant wholesale starting September.',
    color: '#f59e0b',
  },
  {
    id: 'co4',
    name: 'Chamber of Commerce',
    domain: 'chamber.org',
    industry: 'Nonprofit',
    size: '11–50',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    annualPotential: 12000,
    city: 'Austin',
    status: 'customer',
    tags: ['Events', 'Visibility'],
    nextStep: 'Send annual breakfast contract',
    lastTouch: 'Email · 4 hours ago',
    notes: 'Flagship annual breakfast — high brand visibility.',
    color: '#0f766e',
  },
  {
    id: 'co5',
    name: 'Mehta Weddings',
    domain: 'mehtaweddings.com',
    industry: 'Events',
    size: '1–10',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    annualPotential: 9000,
    city: 'Austin',
    status: 'customer',
    tags: ['Wedding', 'Repeat'],
    nextStep: 'Add September cake to production',
    lastTouch: 'Won · Jun 20',
    notes: 'Closed September wedding cake — deposit paid.',
    color: '#be185d',
  },
]

export const SEED_CONTACTS: CrmContact[] = [
  {
    id: 'ct1',
    name: 'Olivia Brooks',
    email: 'olivia@brookslaw.com',
    phone: '+1 555-0142',
    title: 'Office Manager',
    companyId: 'co1',
    companyName: 'Brooks Law',
    segment: 'b2b',
    status: 'lead',
    tags: ['Decision maker', 'Corporate'],
    owner: 'Joy',
    ownerColor: '#64748b',
    source: 'Inbox',
    lifetimeValue: 0,
    lastTouch: 'Email · 2 days ago',
    nextStep: 'Book tasting for the team',
    city: 'Austin',
    notes: 'Wants reliable Tuesday mornings — budget approved in principle.',
    color: '#3b82f6',
  },
  {
    id: 'ct2',
    name: 'Priya Patel',
    email: 'priya@petalevents.com',
    phone: '+1 555-0166',
    title: 'Founder',
    companyId: 'co2',
    companyName: 'Petal Events',
    segment: 'b2b',
    status: 'lead',
    tags: ['Wedding', 'Champion'],
    owner: 'Joy',
    ownerColor: '#64748b',
    source: 'Inbox',
    lifetimeValue: 1250,
    lastTouch: 'Meeting · Today',
    nextStep: 'Send proposal PDF',
    city: 'Austin',
    notes: '80-guest wedding — tasting went well.',
    color: '#8b5cf6',
  },
  {
    id: 'ct3',
    name: 'James Okafor',
    email: 'james@okaforcafe.com',
    phone: '+1 555-0133',
    title: 'Owner',
    companyId: 'co3',
    companyName: 'Okafor Cafe',
    segment: 'b2b',
    status: 'lead',
    tags: ['Wholesale'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'Freya-found',
    lifetimeValue: 0,
    lastTouch: 'Email · 1 day ago',
    nextStep: 'Confirm wholesale pricing',
    city: 'Round Rock',
    notes: 'Needs 40 croissants daily, Mon–Sat.',
    color: '#f59e0b',
  },
  {
    id: 'ct4',
    name: 'Maya Chen',
    email: 'maya.chen@gmail.com',
    phone: '+1 555-0201',
    title: '',
    companyId: null,
    companyName: '—',
    segment: 'b2c',
    status: 'customer',
    tags: ['Repeat', 'Birthday'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'Instagram',
    lifetimeValue: 640,
    lastTouch: 'Order · 5 days ago',
    nextStep: 'Offer loyalty stamp card',
    city: 'Austin',
    notes: 'Orders custom cakes for family birthdays twice a year.',
    color: '#ec4899',
  },
  {
    id: 'ct5',
    name: 'Sam Rivera',
    email: 'sam.r@outlook.com',
    phone: '+1 555-0208',
    title: '',
    companyId: null,
    companyName: '—',
    segment: 'b2c',
    status: 'customer',
    tags: ['Local', 'Weekend regular'],
    owner: 'Joy',
    ownerColor: '#64748b',
    source: 'Walk-in',
    lifetimeValue: 310,
    lastTouch: 'Visit · Yesterday',
    nextStep: 'Invite to Saturday tasting',
    city: 'Austin',
    notes: 'Sourdough regular — brings friends on weekends.',
    color: '#14b8a6',
  },
  {
    id: 'ct6',
    name: 'Elena Vasquez',
    email: 'elena@vasquezstudio.com',
    phone: '+1 555-0188',
    title: 'Producer',
    companyId: null,
    companyName: 'Vasquez Studio',
    segment: 'b2b',
    status: 'lead',
    tags: ['Catering', 'GF'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'Inbox',
    lifetimeValue: 0,
    lastTouch: 'Task due · Tomorrow',
    nextStep: 'Revise GF menu pricing',
    city: 'Austin',
    notes: 'Needs gluten-free catering for client shoot days.',
    color: '#f97316',
  },
  {
    id: 'ct7',
    name: 'Aisha Khan',
    email: 'aisha@khanstudio.com',
    phone: '+1 555-0155',
    title: 'Creative Director',
    companyId: null,
    companyName: 'Khan Studio',
    segment: 'b2b',
    status: 'customer',
    tags: ['Repeat', 'Subscription'],
    owner: 'Freya',
    ownerColor: '#38bdf8',
    source: 'Freya-found',
    lifetimeValue: 420,
    lastTouch: 'Won · Jun 28',
    nextStep: 'Confirm August box flavors',
    city: 'Austin',
    notes: 'Monthly pastry box subscriber.',
    color: '#1e40af',
  },
  {
    id: 'ct8',
    name: 'Jordan Lee',
    email: 'jordan.lee@icloud.com',
    phone: '+1 555-0222',
    title: '',
    companyId: null,
    companyName: '—',
    segment: 'b2c',
    status: 'lead',
    tags: ['Custom Order', 'Wedding'],
    owner: 'Joy',
    ownerColor: '#64748b',
    source: 'Facebook',
    lifetimeValue: 0,
    lastTouch: 'DM · 3 days ago',
    nextStep: 'Schedule cake consultation',
    city: 'Cedar Park',
    notes: 'Asked about engagement party dessert table.',
    color: '#6366f1',
  },
]

export const SEED_DEALS: CrmDeal[] = [
  {
    id: 'd1',
    title: 'Corporate breakfast — 40 pax',
    companyId: 'co1',
    company: 'Brooks Law',
    contactId: 'ct1',
    contact: 'Olivia Brooks',
    email: 'olivia@brookslaw.com',
    phone: '+1 555-0142',
    value: 2400,
    stage: 'qualified',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-07-28',
    source: 'Inbox',
    product: 'Corporate catering',
    lastActivity: 'Email · 2 days ago',
    nextStep: 'Send tasting menu',
    note: 'Weekly standing order interest — first tasting booked.',
    createdAt: '2026-07-10',
    competitors: 'Local cafe chain',
    decisionMaker: 'Olivia Brooks',
  },
  {
    id: 'd2',
    title: 'Film set craft service',
    companyId: null,
    company: 'Santos Film',
    contactId: null,
    contact: 'Diego Santos',
    email: 'diego@santosfilm.com',
    phone: '+1 555-0198',
    value: 1800,
    stage: 'qualified',
    priority: 'medium',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    closeDate: '2026-08-05',
    source: 'Campaign',
    product: 'Craft service boxes',
    lastActivity: 'Call · Yesterday',
    nextStep: 'Confirm shoot dates',
    note: '3-day shoot — pastry boxes + coffee add-on.',
    createdAt: '2026-07-12',
    competitors: '—',
    decisionMaker: 'Diego Santos',
  },
  {
    id: 'd3',
    title: 'Engagement dessert table',
    companyId: null,
    company: '—',
    contactId: 'ct8',
    contact: 'Jordan Lee',
    email: 'jordan.lee@icloud.com',
    phone: '+1 555-0222',
    value: 650,
    stage: 'qualified',
    priority: 'medium',
    segment: 'b2c',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-08-02',
    source: 'Facebook',
    product: 'Custom dessert table',
    lastActivity: 'DM · 3 days ago',
    nextStep: 'Schedule consultation',
    note: 'B2C custom order — engagement party for 30 guests.',
    createdAt: '2026-07-13',
    competitors: 'Home bakers',
    decisionMaker: 'Jordan Lee',
  },
  {
    id: 'd4',
    title: 'Wedding cake package',
    companyId: 'co2',
    company: 'Petal Events',
    contactId: 'ct2',
    contact: 'Priya Patel',
    email: 'priya@petalevents.com',
    phone: '+1 555-0166',
    value: 1250,
    stage: 'meeting',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-07-22',
    source: 'Inbox',
    product: 'Wedding cake',
    lastActivity: 'Meeting · Today',
    nextStep: 'Send proposal PDF',
    note: '80 guests — tasting scheduled for Thursday.',
    createdAt: '2026-07-05',
    competitors: 'Two boutique bakeries',
    decisionMaker: 'Priya Patel',
  },
  {
    id: 'd5',
    title: 'Birthday cake — Maya',
    companyId: null,
    company: '—',
    contactId: 'ct4',
    contact: 'Maya Chen',
    email: 'maya.chen@gmail.com',
    phone: '+1 555-0201',
    value: 180,
    stage: 'meeting',
    priority: 'low',
    segment: 'b2c',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    closeDate: '2026-07-20',
    source: 'Instagram',
    product: 'Custom cake',
    lastActivity: 'Chat · Today',
    nextStep: 'Confirm flavor + pickup',
    note: 'Daughter’s birthday — berry theme requested.',
    createdAt: '2026-07-14',
    competitors: '—',
    decisionMaker: 'Maya Chen',
  },
  {
    id: 'd6',
    title: 'Cafe wholesale croissants',
    companyId: 'co3',
    company: 'Okafor Cafe',
    contactId: 'ct3',
    contact: 'James Okafor',
    email: 'james@okaforcafe.com',
    phone: '+1 555-0133',
    value: 3200,
    stage: 'proposal',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-08-10',
    source: 'Freya-found',
    product: 'Wholesale pastry',
    lastActivity: 'Email · 1 day ago',
    nextStep: 'Await sample feedback',
    note: 'Weekly wholesale — sample batch delivered.',
    createdAt: '2026-06-28',
    competitors: 'Sysco bakery line',
    decisionMaker: 'James Okafor',
  },
  {
    id: 'd7',
    title: 'Gluten-free catering day',
    companyId: null,
    company: 'Vasquez Studio',
    contactId: 'ct6',
    contact: 'Elena Vasquez',
    email: 'elena@vasquezstudio.com',
    phone: '+1 555-0188',
    value: 980,
    stage: 'proposal',
    priority: 'medium',
    segment: 'b2b',
    owner: 'Freya',
    ownerColor: '#38bdf8',
    closeDate: '2026-07-30',
    source: 'Inbox',
    product: 'GF catering',
    lastActivity: 'Task due · Tomorrow',
    nextStep: 'Revise GF menu pricing',
    note: 'Client shoot day — proposal with 3 package options.',
    createdAt: '2026-07-01',
    competitors: 'Specialty GF bakery',
    decisionMaker: 'Elena Vasquez',
  },
  {
    id: 'd8',
    title: 'Book launch reception',
    companyId: null,
    company: 'Becker Books',
    contactId: null,
    contact: 'Tom Becker',
    email: 'tom@beckerbooks.com',
    phone: '+1 555-0122',
    value: 1650,
    stage: 'negotiation',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-07-25',
    source: 'Campaign',
    product: 'Event catering',
    lastActivity: 'Call · Today',
    nextStep: 'Confirm deposit terms',
    note: 'Budget locked — negotiating delivery window.',
    createdAt: '2026-06-20',
    competitors: 'Hotel catering',
    decisionMaker: 'Tom Becker',
  },
  {
    id: 'd9',
    title: 'Chamber breakfast catering',
    companyId: 'co4',
    company: 'Chamber of Commerce',
    contactId: null,
    contact: 'Nora Williams',
    email: 'nora@chamber.org',
    phone: '+1 555-0100',
    value: 4500,
    stage: 'negotiation',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-08-15',
    source: 'Referral',
    product: 'Large event catering',
    lastActivity: 'Email · 4 hours ago',
    nextStep: 'Send contract',
    note: 'Annual breakfast — final headcount ~120.',
    createdAt: '2026-06-15',
    competitors: 'Hotel ballroom',
    decisionMaker: 'Nora Williams',
  },
  {
    id: 'd10',
    title: 'Monthly pastry box',
    companyId: null,
    company: 'Khan Studio',
    contactId: 'ct7',
    contact: 'Aisha Khan',
    email: 'aisha@khanstudio.com',
    phone: '+1 555-0155',
    value: 420,
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
    title: 'September wedding cake',
    companyId: 'co5',
    company: 'Mehta Weddings',
    contactId: null,
    contact: 'Raj Mehta',
    email: 'raj@mehtaweddings.com',
    phone: '+1 555-0199',
    value: 1800,
    stage: 'won',
    priority: 'high',
    segment: 'b2b',
    owner: 'Joy',
    ownerColor: '#64748b',
    closeDate: '2026-06-20',
    source: 'Campaign',
    product: 'Wedding cake',
    lastActivity: 'Won · Jun 20',
    nextStep: 'Add to production calendar',
    note: 'Deposit paid — September wedding locked.',
    createdAt: '2026-06-01',
    competitors: '—',
    decisionMaker: 'Raj Mehta',
  },
  {
    id: 'd12',
    title: 'Weekend pastry club signup',
    companyId: null,
    company: '—',
    contactId: 'ct5',
    contact: 'Sam Rivera',
    email: 'sam.r@outlook.com',
    phone: '+1 555-0208',
    value: 96,
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
    note: 'Joined weekend pastry club — $24/month.',
    createdAt: '2026-07-12',
    competitors: '—',
    decisionMaker: 'Sam Rivera',
  },
]

export const SEED_ACTIVITIES: CrmActivity[] = [
  {
    id: 'a1',
    type: 'task',
    title: 'Send tasting menu to Olivia Brooks',
    relatedType: 'deal',
    relatedId: 'd1',
    relatedLabel: 'Corporate breakfast — 40 pax',
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
    title: 'Wedding cake tasting with Priya',
    relatedType: 'deal',
    relatedId: 'd4',
    relatedLabel: 'Wedding cake package',
    dueDate: '2026-07-16',
    done: false,
    owner: 'Joy',
    freyaDrafted: false,
    segment: 'b2b',
    notes: 'In-shop tasting — berry + champagne options.',
  },
  {
    id: 'a3',
    type: 'call',
    title: 'Confirm shoot dates with Diego',
    relatedType: 'deal',
    relatedId: 'd2',
    relatedLabel: 'Film set craft service',
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
    title: 'Loyalty invite to Sam Rivera',
    relatedType: 'contact',
    relatedId: 'ct5',
    relatedLabel: 'Sam Rivera',
    dueDate: '2026-07-18',
    done: false,
    owner: 'Freya',
    freyaDrafted: true,
    segment: 'b2c',
    notes: 'B2C nurture — weekend pastry club upsell.',
  },
  {
    id: 'a5',
    type: 'task',
    title: 'Revise GF catering pricing for Elena',
    relatedType: 'deal',
    relatedId: 'd7',
    relatedLabel: 'Gluten-free catering day',
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
    title: 'Chamber wants branded napkin add-on',
    relatedType: 'company',
    relatedId: 'co4',
    relatedLabel: 'Chamber of Commerce',
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
    relatedLabel: 'Wedding cake package',
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
    title: 'Cake consultation with Jordan Lee',
    relatedType: 'contact',
    relatedId: 'ct8',
    relatedLabel: 'Jordan Lee',
    dueDate: '2026-07-19',
    done: false,
    owner: 'Joy',
    freyaDrafted: false,
    segment: 'b2c',
    notes: 'B2C consult — engagement party dessert table.',
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
    body: 'Maya, Sam, and Jordan all have next steps due this week. Want me to queue friendly messages in your voice?',
    actionLabel: 'Queue messages',
    relatedType: 'activity',
    relatedId: 'a4',
    segment: 'b2c',
  },
  {
    id: 'i3',
    tone: 'win',
    title: 'Wholesale path looks strong',
    body: 'Okafor Cafe’s sample feedback is overdue by 1 day — but similar wholesale deals historically close at 62% once samples land. Ping James today.',
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
    title: 'Priya tasting is today',
    body: 'I prepped talking points: berry seasonal, champagne glaze, and a photographer-friendly tier. Approve and I’ll put them in your notes.',
    actionLabel: 'Show talking points',
    relatedType: 'deal',
    relatedId: 'd4',
    segment: 'b2b',
  },
]

export function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
