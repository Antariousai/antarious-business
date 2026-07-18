/** Antarious Money — Freya-managed bookkeeping demo data */

export type MoneyPartyKind = 'customer' | 'vendor'
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'void'
export type BillStatus = 'draft' | 'awaiting' | 'scheduled' | 'paid' | 'overdue'
export type ExpenseStatus = 'needs-review' | 'approved' | 'reimbursed' | 'rejected'
export type TxnStatus = 'unmatched' | 'matched' | 'reconciled' | 'excluded'
export type TxnDirection = 'in' | 'out'
export type AccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity'
export type InsightTone = 'action' | 'risk' | 'win' | 'info'

export const INVOICE_STATUSES: { id: InvoiceStatus; label: string; color: string }[] = [
  { id: 'draft', label: 'Draft', color: '#94a3b8' },
  { id: 'sent', label: 'Sent', color: '#579bfc' },
  { id: 'viewed', label: 'Viewed', color: '#a25ddc' },
  { id: 'partial', label: 'Partial', color: '#fdab3d' },
  { id: 'paid', label: 'Paid', color: '#00c875' },
  { id: 'overdue', label: 'Overdue', color: '#e2445c' },
  { id: 'void', label: 'Void', color: '#c4c4c4' },
]

export const BILL_STATUSES: { id: BillStatus; label: string; color: string }[] = [
  { id: 'draft', label: 'Draft', color: '#94a3b8' },
  { id: 'awaiting', label: 'Awaiting payment', color: '#fdab3d' },
  { id: 'scheduled', label: 'Scheduled', color: '#579bfc' },
  { id: 'paid', label: 'Paid', color: '#00c875' },
  { id: 'overdue', label: 'Overdue', color: '#e2445c' },
]

export const EXPENSE_CATEGORIES = [
  'Ingredients',
  'Packaging',
  'Rent',
  'Utilities',
  'Marketing',
  'Payroll',
  'Equipment',
  'Delivery',
  'Software',
  'Insurance',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface MoneyParty {
  id: string
  name: string
  kind: MoneyPartyKind
  email: string
  phone: string
  company?: string
  balance: number
  tags: string[]
  notes: string
  color: string
  lastActivity: string
}

export interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
}

export interface Invoice {
  id: string
  number: string
  customerId: string
  customerName: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  paidDate?: string
  currency: string
  items: LineItem[]
  amountPaid: number
  notes: string
  freyaDrafted: boolean
  reminderSent: boolean
}

export interface Bill {
  id: string
  number: string
  vendorId: string
  vendorName: string
  status: BillStatus
  issueDate: string
  dueDate: string
  paidDate?: string
  category: ExpenseCategory
  items: LineItem[]
  amountPaid: number
  notes: string
  freyaFlagged: boolean
}

export interface Expense {
  id: string
  merchant: string
  date: string
  amount: number
  category: ExpenseCategory
  status: ExpenseStatus
  accountId: string
  receipt: boolean
  notes: string
  freyaSuggestedCategory?: ExpenseCategory
  submittedBy: string
}

export interface BankAccount {
  id: string
  name: string
  institution: string
  type: 'checking' | 'savings' | 'card'
  currency: string
  balance: number
  lastSynced: string
  color: string
}

export interface BankTransaction {
  id: string
  accountId: string
  date: string
  description: string
  amount: number
  direction: TxnDirection
  status: TxnStatus
  category?: ExpenseCategory | 'Sales' | 'Transfer' | 'Tax'
  matchedTo?: { type: 'invoice' | 'bill' | 'expense'; id: string; label: string }
  freyaMatchConfidence?: number
}

export interface LedgerAccount {
  id: string
  code: string
  name: string
  type: AccountType
  balance: number
  budgetMonthly?: number
  watchlist: boolean
}

export interface CashMonth {
  month: string
  cashIn: number
  cashOut: number
}

export interface MoneyInsight {
  id: string
  tone: InsightTone
  title: string
  body: string
  actionLabel?: string
  actionKind?: 'chase' | 'categorize' | 'pay-bills' | 'reconcile' | 'invoice'
}

export function lineTotal(item: LineItem) {
  return item.qty * item.unitPrice
}

export function docTotal(items: LineItem[]) {
  return items.reduce((s, i) => s + lineTotal(i), 0)
}

export function invoiceBalance(inv: Invoice) {
  return Math.max(0, docTotal(inv.items) - inv.amountPaid)
}

export function billBalance(bill: Bill) {
  return Math.max(0, docTotal(bill.items) - bill.amountPaid)
}

export function formatMoney(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatMoneyExact(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)
}

export function invoiceStatusMeta(id: InvoiceStatus) {
  return INVOICE_STATUSES.find((s) => s.id === id) ?? INVOICE_STATUSES[0]
}

export function billStatusMeta(id: BillStatus) {
  return BILL_STATUSES.find((s) => s.id === id) ?? BILL_STATUSES[0]
}

export function agingBucket(dueDate: string, status: string): 'current' | '1-30' | '31-60' | '60+' {
  if (status === 'paid' || status === 'void') return 'current'
  const due = new Date(dueDate).getTime()
  const now = new Date('2026-07-16').getTime()
  const days = Math.floor((now - due) / 86400000)
  if (days <= 0) return 'current'
  if (days <= 30) return '1-30'
  if (days <= 60) return '31-60'
  return '60+'
}

/* ——— Seed parties ——— */
export const SEED_PARTIES: MoneyParty[] = [
  {
    id: 'p1',
    name: 'Priya Patel',
    kind: 'customer',
    email: 'priya@events.co',
    phone: '+1 415 555 0142',
    company: 'Priya Events',
    balance: 840,
    tags: ['wedding', 'VIP'],
    notes: 'Custom cakes — high AOV',
    color: '#8b5cf6',
    lastActivity: '2d ago',
  },
  {
    id: 'p2',
    name: 'Brooks Law',
    kind: 'customer',
    email: 'olivia@brookslaw.com',
    phone: '+1 415 555 0199',
    company: 'Brooks Law',
    balance: 1920,
    tags: ['B2B', 'standing order'],
    notes: 'Weekly office breakfast interest',
    color: '#3b82f6',
    lastActivity: '3h ago',
  },
  {
    id: 'p3',
    name: 'Elena Vasquez',
    kind: 'customer',
    email: 'elena@studio.com',
    phone: '+1 628 555 0110',
    company: 'Studio V',
    balance: 0,
    tags: ['catering', 'GF'],
    notes: 'Gluten-free catering shoots',
    color: '#ea580c',
    lastActivity: '1h ago',
  },
  {
    id: 'p4',
    name: 'Müller Events',
    kind: 'customer',
    email: 'hannah@mullerevents.com',
    phone: '+1 510 555 0177',
    company: 'Müller Events',
    balance: 1800,
    tags: ['events'],
    notes: 'Garden party dessert table quote',
    color: '#ef4444',
    lastActivity: '2d ago',
  },
  {
    id: 'p5',
    name: 'Okafor Cafe',
    kind: 'customer',
    email: 'james@okafor.cafe',
    phone: '+1 415 555 0133',
    company: 'Okafor Cafe',
    balance: 0,
    tags: ['wholesale'],
    notes: 'Wholesale croissant samples approved',
    color: '#f59e0b',
    lastActivity: '3d ago',
  },
  {
    id: 'p6',
    name: 'Bay Flour Co.',
    kind: 'vendor',
    email: 'orders@bayflour.com',
    phone: '+1 510 555 0201',
    company: 'Bay Flour Co.',
    balance: -640,
    tags: ['ingredients'],
    notes: 'Primary flour supplier — Net 15',
    color: '#0ea5e9',
    lastActivity: '1d ago',
  },
  {
    id: 'p7',
    name: 'GreenBox Packaging',
    kind: 'vendor',
    email: 'billing@greenbox.io',
    phone: '+1 415 555 0288',
    company: 'GreenBox Packaging',
    balance: -210,
    tags: ['packaging'],
    notes: 'Compostable cake boxes',
    color: '#14b8a6',
    lastActivity: '4d ago',
  },
  {
    id: 'p8',
    name: 'Mission Utilities',
    kind: 'vendor',
    email: 'pay@missionutil.com',
    phone: '+1 800 555 0100',
    company: 'Mission Utilities',
    balance: -380,
    tags: ['utilities'],
    notes: 'Gas + electric for kitchen',
    color: '#64748b',
    lastActivity: '5d ago',
  },
  {
    id: 'p9',
    name: 'Sam Rivera',
    kind: 'customer',
    email: 'sam@email.com',
    phone: '+1 415 555 0166',
    balance: 24,
    tags: ['pastry club'],
    notes: 'Weekend pastry club member',
    color: '#14b8a6',
    lastActivity: 'Yesterday',
  },
]

/* ——— Seed invoices ——— */
export const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    number: 'INV-1042',
    customerId: 'p1',
    customerName: 'Priya Patel',
    status: 'overdue',
    issueDate: '2026-06-20',
    dueDate: '2026-07-04',
    currency: 'USD',
    items: [
      { id: 'li1', description: '3-tier wedding cake tasting deposit', qty: 1, unitPrice: 350 },
      { id: 'li2', description: 'Custom sugar flowers (sample set)', qty: 1, unitPrice: 120 },
      { id: 'li3', description: 'Delivery to venue (SF)', qty: 1, unitPrice: 75 },
    ],
    amountPaid: 0,
    notes: 'Deposit for Aug 22 wedding',
    freyaDrafted: true,
    reminderSent: false,
  },
  {
    id: 'inv2',
    number: 'INV-1043',
    customerId: 'p2',
    customerName: 'Brooks Law',
    status: 'sent',
    issueDate: '2026-07-08',
    dueDate: '2026-07-22',
    currency: 'USD',
    items: [
      { id: 'li1', description: 'Standing Tuesday breakfast (40 pax) — week of Jul 7', qty: 1, unitPrice: 480 },
      { id: 'li2', description: 'Coffee & juice add-on', qty: 1, unitPrice: 160 },
    ],
    amountPaid: 0,
    notes: 'First standing order invoice',
    freyaDrafted: true,
    reminderSent: false,
  },
  {
    id: 'inv3',
    number: 'INV-1044',
    customerId: 'p4',
    customerName: 'Müller Events',
    status: 'viewed',
    issueDate: '2026-07-10',
    dueDate: '2026-07-24',
    currency: 'USD',
    items: [
      { id: 'li1', description: 'Dessert table package — 60 guests', qty: 1, unitPrice: 1800 },
    ],
    amountPaid: 0,
    notes: 'Quote accepted — awaiting payment',
    freyaDrafted: true,
    reminderSent: false,
  },
  {
    id: 'inv4',
    number: 'INV-1040',
    customerId: 'p3',
    customerName: 'Elena Vasquez',
    status: 'paid',
    issueDate: '2026-06-28',
    dueDate: '2026-07-05',
    paidDate: '2026-07-03',
    currency: 'USD',
    items: [
      { id: 'li1', description: 'GF catering — 20 pax shoot day', qty: 1, unitPrice: 640 },
      { id: 'li2', description: 'Nut-free dessert add-on', qty: 1, unitPrice: 120 },
    ],
    amountPaid: 760,
    notes: '',
    freyaDrafted: false,
    reminderSent: false,
  },
  {
    id: 'inv5',
    number: 'INV-1041',
    customerId: 'p5',
    customerName: 'Okafor Cafe',
    status: 'partial',
    issueDate: '2026-07-01',
    dueDate: '2026-07-15',
    currency: 'USD',
    items: [
      { id: 'li1', description: 'Wholesale croissants (case of 48)', qty: 4, unitPrice: 72 },
      { id: 'li2', description: 'Pain au chocolat (case of 36)', qty: 2, unitPrice: 84 },
    ],
    amountPaid: 200,
    notes: 'Wholesale trial — balance due',
    freyaDrafted: false,
    reminderSent: true,
  },
  {
    id: 'inv6',
    number: 'INV-1045',
    customerId: 'p9',
    customerName: 'Sam Rivera',
    status: 'draft',
    issueDate: '2026-07-16',
    dueDate: '2026-07-23',
    currency: 'USD',
    items: [
      { id: 'li1', description: 'Pastry club — July membership', qty: 1, unitPrice: 24 },
    ],
    amountPaid: 0,
    notes: 'Freya drafted from signup',
    freyaDrafted: true,
    reminderSent: false,
  },
  {
    id: 'inv7',
    number: 'INV-1038',
    customerId: 'p2',
    customerName: 'Brooks Law',
    status: 'paid',
    issueDate: '2026-06-10',
    dueDate: '2026-06-24',
    paidDate: '2026-06-20',
    currency: 'USD',
    items: [
      { id: 'li1', description: 'Catered partner lunch — 25 pax', qty: 1, unitPrice: 875 },
    ],
    amountPaid: 875,
    notes: '',
    freyaDrafted: false,
    reminderSent: false,
  },
  {
    id: 'inv8',
    number: 'INV-1039',
    customerId: 'p1',
    customerName: 'Priya Patel',
    status: 'overdue',
    issueDate: '2026-05-28',
    dueDate: '2026-06-11',
    currency: 'USD',
    items: [
      { id: 'li1', description: 'Engagement party dessert bar', qty: 1, unitPrice: 295 },
    ],
    amountPaid: 0,
    notes: 'Second overdue — Freya recommends chase',
    freyaDrafted: false,
    reminderSent: true,
  },
]

/* ——— Seed bills ——— */
export const SEED_BILLS: Bill[] = [
  {
    id: 'bill1',
    number: 'BILL-220',
    vendorId: 'p6',
    vendorName: 'Bay Flour Co.',
    status: 'overdue',
    issueDate: '2026-06-28',
    dueDate: '2026-07-13',
    category: 'Ingredients',
    items: [
      { id: 'li1', description: 'Organic bread flour — 50lb × 8', qty: 8, unitPrice: 42 },
      { id: 'li2', description: 'Pastry flour — 25lb × 4', qty: 4, unitPrice: 38 },
    ],
    amountPaid: 0,
    notes: 'Net 15 — overdue by 3 days',
    freyaFlagged: true,
  },
  {
    id: 'bill2',
    number: 'BILL-221',
    vendorId: 'p7',
    vendorName: 'GreenBox Packaging',
    status: 'awaiting',
    issueDate: '2026-07-08',
    dueDate: '2026-07-22',
    category: 'Packaging',
    items: [
      { id: 'li1', description: 'Compostable cake boxes (med) — pack of 50', qty: 3, unitPrice: 48 },
      { id: 'li2', description: 'Window pastry bags — pack of 100', qty: 2, unitPrice: 33 },
    ],
    amountPaid: 0,
    notes: '',
    freyaFlagged: false,
  },
  {
    id: 'bill3',
    number: 'BILL-222',
    vendorId: 'p8',
    vendorName: 'Mission Utilities',
    status: 'scheduled',
    issueDate: '2026-07-01',
    dueDate: '2026-07-18',
    category: 'Utilities',
    items: [{ id: 'li1', description: 'Kitchen gas + electric — June', qty: 1, unitPrice: 380 }],
    amountPaid: 0,
    notes: 'Auto-pay scheduled Jul 18',
    freyaFlagged: false,
  },
  {
    id: 'bill4',
    number: 'BILL-218',
    vendorId: 'p6',
    vendorName: 'Bay Flour Co.',
    status: 'paid',
    issueDate: '2026-06-01',
    dueDate: '2026-06-16',
    paidDate: '2026-06-14',
    category: 'Ingredients',
    items: [{ id: 'li1', description: 'June flour restock', qty: 1, unitPrice: 520 }],
    amountPaid: 520,
    notes: '',
    freyaFlagged: false,
  },
  {
    id: 'bill5',
    number: 'BILL-223',
    vendorId: 'p7',
    vendorName: 'GreenBox Packaging',
    status: 'draft',
    issueDate: '2026-07-15',
    dueDate: '2026-07-29',
    category: 'Packaging',
    items: [{ id: 'li1', description: 'Ribbon & labels restock', qty: 1, unitPrice: 95 }],
    amountPaid: 0,
    notes: 'Freya suggested from low stock alert',
    freyaFlagged: true,
  },
]

/* ——— Seed expenses ——— */
export const SEED_EXPENSES: Expense[] = [
  {
    id: 'ex1',
    merchant: 'Meta Ads',
    date: '2026-07-14',
    amount: 186,
    category: 'Marketing',
    status: 'needs-review',
    accountId: 'ba1',
    receipt: false,
    notes: 'Boost wedding cake reel',
    freyaSuggestedCategory: 'Marketing',
    submittedBy: 'Freya',
  },
  {
    id: 'ex2',
    merchant: 'Uber Freight',
    date: '2026-07-13',
    amount: 42,
    category: 'Delivery',
    status: 'needs-review',
    accountId: 'ba3',
    receipt: true,
    notes: 'Rush flour pickup',
    freyaSuggestedCategory: 'Delivery',
    submittedBy: 'Joy',
  },
  {
    id: 'ex3',
    merchant: 'Square POS fees',
    date: '2026-07-12',
    amount: 68,
    category: 'Software',
    status: 'approved',
    accountId: 'ba1',
    receipt: true,
    notes: 'Weekly processing fees',
    submittedBy: 'Freya',
  },
  {
    id: 'ex4',
    merchant: 'KitchenAid parts',
    date: '2026-07-09',
    amount: 129,
    category: 'Equipment',
    status: 'approved',
    accountId: 'ba3',
    receipt: true,
    notes: 'Mixer dough hook replacement',
    submittedBy: 'Joy',
  },
  {
    id: 'ex5',
    merchant: 'Canva Pro',
    date: '2026-07-05',
    amount: 15,
    category: 'Software',
    status: 'reimbursed',
    accountId: 'ba3',
    receipt: true,
    notes: 'Monthly design tools',
    submittedBy: 'Joy',
  },
  {
    id: 'ex6',
    merchant: 'Farmers market stall',
    date: '2026-07-11',
    amount: 85,
    category: 'Marketing',
    status: 'needs-review',
    accountId: 'ba1',
    receipt: false,
    notes: 'Saturday stall fee',
    freyaSuggestedCategory: 'Marketing',
    submittedBy: 'Freya',
  },
  {
    id: 'ex7',
    merchant: 'PG&E deposit adjust',
    date: '2026-07-02',
    amount: 50,
    category: 'Utilities',
    status: 'rejected',
    accountId: 'ba1',
    receipt: false,
    notes: 'Duplicate — already on utility bill',
    submittedBy: 'Freya',
  },
]

/* ——— Bank accounts ——— */
export const SEED_ACCOUNTS: BankAccount[] = [
  {
    id: 'ba1',
    name: 'Business Checking',
    institution: 'Chase',
    type: 'checking',
    currency: 'USD',
    balance: 18420,
    lastSynced: 'Just now',
    color: '#1e40af',
  },
  {
    id: 'ba2',
    name: 'Tax Savings',
    institution: 'Chase',
    type: 'savings',
    currency: 'USD',
    balance: 6200,
    lastSynced: '1h ago',
    color: '#0f766e',
  },
  {
    id: 'ba3',
    name: 'Ops Card',
    institution: 'Amex',
    type: 'card',
    currency: 'USD',
    balance: -1240,
    lastSynced: 'Just now',
    color: '#7c3aed',
  },
]

/* ——— Bank transactions ——— */
export const SEED_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'tx1',
    accountId: 'ba1',
    date: '2026-07-15',
    description: 'SQUARE * JOY BAKERY',
    amount: 412,
    direction: 'in',
    status: 'matched',
    category: 'Sales',
    matchedTo: { type: 'invoice', id: 'inv4', label: 'INV-1040 Elena' },
    freyaMatchConfidence: 96,
  },
  {
    id: 'tx2',
    accountId: 'ba1',
    date: '2026-07-14',
    description: 'META PLATFORMS ADS',
    amount: 186,
    direction: 'out',
    status: 'unmatched',
    freyaMatchConfidence: 88,
  },
  {
    id: 'tx3',
    accountId: 'ba1',
    date: '2026-07-13',
    description: 'BAY FLOUR CO ACH',
    amount: 520,
    direction: 'out',
    status: 'matched',
    category: 'Ingredients',
    matchedTo: { type: 'bill', id: 'bill4', label: 'BILL-218 Bay Flour' },
    freyaMatchConfidence: 99,
  },
  {
    id: 'tx4',
    accountId: 'ba1',
    date: '2026-07-12',
    description: 'STRIPE TRANSFER',
    amount: 875,
    direction: 'in',
    status: 'reconciled',
    category: 'Sales',
    matchedTo: { type: 'invoice', id: 'inv7', label: 'INV-1038 Brooks' },
    freyaMatchConfidence: 97,
  },
  {
    id: 'tx5',
    accountId: 'ba3',
    date: '2026-07-13',
    description: 'UBER *TRIP',
    amount: 42,
    direction: 'out',
    status: 'unmatched',
    freyaMatchConfidence: 72,
  },
  {
    id: 'tx6',
    accountId: 'ba1',
    date: '2026-07-11',
    description: 'FARMERS MKT STALL',
    amount: 85,
    direction: 'out',
    status: 'unmatched',
    freyaMatchConfidence: 81,
  },
  {
    id: 'tx7',
    accountId: 'ba1',
    date: '2026-07-10',
    description: 'TRANSFER TO TAX SAVINGS',
    amount: 800,
    direction: 'out',
    status: 'reconciled',
    category: 'Transfer',
  },
  {
    id: 'tx8',
    accountId: 'ba2',
    date: '2026-07-10',
    description: 'TRANSFER FROM CHECKING',
    amount: 800,
    direction: 'in',
    status: 'reconciled',
    category: 'Transfer',
  },
  {
    id: 'tx9',
    accountId: 'ba1',
    date: '2026-07-09',
    description: 'OKAFOR CAFE WIRE',
    amount: 200,
    direction: 'in',
    status: 'matched',
    category: 'Sales',
    matchedTo: { type: 'invoice', id: 'inv5', label: 'INV-1041 partial' },
    freyaMatchConfidence: 94,
  },
  {
    id: 'tx10',
    accountId: 'ba3',
    date: '2026-07-09',
    description: 'KITCHENAID.COM',
    amount: 129,
    direction: 'out',
    status: 'matched',
    category: 'Equipment',
    matchedTo: { type: 'expense', id: 'ex4', label: 'KitchenAid parts' },
    freyaMatchConfidence: 91,
  },
  {
    id: 'tx11',
    accountId: 'ba1',
    date: '2026-07-08',
    description: 'UNKNOWN ACH DEBIT',
    amount: 29,
    direction: 'out',
    status: 'unmatched',
    freyaMatchConfidence: 40,
  },
  {
    id: 'tx12',
    accountId: 'ba1',
    date: '2026-07-06',
    description: 'SQUARE * JOY BAKERY',
    amount: 268,
    direction: 'in',
    status: 'reconciled',
    category: 'Sales',
  },
]

/* ——— Chart of accounts (watchlist) ——— */
export const SEED_LEDGER: LedgerAccount[] = [
  { id: 'la1', code: '1000', name: 'Business Checking', type: 'asset', balance: 18420, watchlist: true },
  { id: 'la2', code: '1100', name: 'Tax Savings', type: 'asset', balance: 6200, watchlist: true },
  { id: 'la3', code: '2000', name: 'Ops Card', type: 'liability', balance: -1240, watchlist: true },
  {
    id: 'la4',
    code: '4000',
    name: 'Product sales',
    type: 'income',
    balance: 12480,
    budgetMonthly: 14000,
    watchlist: true,
  },
  {
    id: 'la5',
    code: '4100',
    name: 'Catering & events',
    type: 'income',
    balance: 8640,
    budgetMonthly: 8000,
    watchlist: true,
  },
  {
    id: 'la6',
    code: '5000',
    name: 'Ingredients',
    type: 'expense',
    balance: 3120,
    budgetMonthly: 3500,
    watchlist: true,
  },
  {
    id: 'la7',
    code: '5100',
    name: 'Marketing',
    type: 'expense',
    balance: 980,
    budgetMonthly: 800,
    watchlist: true,
  },
  {
    id: 'la8',
    code: '5200',
    name: 'Rent',
    type: 'expense',
    balance: 4200,
    budgetMonthly: 4200,
    watchlist: false,
  },
  {
    id: 'la9',
    code: '5300',
    name: 'Payroll',
    type: 'expense',
    balance: 6800,
    budgetMonthly: 7000,
    watchlist: true,
  },
  { id: 'la10', code: '3000', name: 'Owner equity', type: 'equity', balance: 22000, watchlist: false },
]

export const SEED_CASHFLOW: CashMonth[] = [
  { month: 'Feb', cashIn: 14200, cashOut: 11800 },
  { month: 'Mar', cashIn: 15800, cashOut: 12100 },
  { month: 'Apr', cashIn: 14900, cashOut: 13200 },
  { month: 'May', cashIn: 17200, cashOut: 14100 },
  { month: 'Jun', cashIn: 18600, cashOut: 15200 },
  { month: 'Jul', cashIn: 9800, cashOut: 7400 },
]

export const SEED_INSIGHTS: MoneyInsight[] = [
  {
    id: 'mi1',
    tone: 'risk',
    title: '2 invoices overdue — $840 sitting out',
    body: 'Priya Patel still owes INV-1042 and INV-1038. Cash gets tighter if we wait past 30 days.',
    actionLabel: 'Chase with Freya',
    actionKind: 'chase',
  },
  {
    id: 'mi2',
    tone: 'action',
    title: '3 bank transactions need a match',
    body: 'Meta Ads, Uber, and an unknown ACH are waiting. I can categorize them in one tap.',
    actionLabel: 'Review matches',
    actionKind: 'reconcile',
  },
  {
    id: 'mi3',
    tone: 'action',
    title: 'Bay Flour bill is overdue',
    body: 'BILL-220 ($496) passed Net 15. Paying today keeps the supplier relationship healthy.',
    actionLabel: 'Schedule payment',
    actionKind: 'pay-bills',
  },
  {
    id: 'mi4',
    tone: 'win',
    title: 'Catering income beat budget',
    body: 'Events revenue is $640 above this month’s plan — mostly Brooks Law and Müller.',
    actionLabel: 'See P&L',
  },
  {
    id: 'mi5',
    tone: 'info',
    title: 'Draft pastry-club invoice ready',
    body: 'Sam Rivera signed up. INV-1045 is drafted — approve and send when you’re ready.',
    actionLabel: 'Open draft',
    actionKind: 'invoice',
  },
  {
    id: 'mi6',
    tone: 'risk',
    title: 'Marketing spend over budget',
    body: 'Marketing is at $980 vs $800 plan. Meta Ads and the farmers market stall drove it.',
    actionLabel: 'Review expenses',
    actionKind: 'categorize',
  },
]
