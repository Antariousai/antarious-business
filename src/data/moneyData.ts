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
  'Inventory',
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
  category?: ExpenseCategory | 'Sales' | 'Transfer' | 'Tax' | 'Inventory'
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

export function formatMoney(n: number, currency = 'BDT') {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatMoneyExact(n: number, currency = 'BDT') {
  return new Intl.NumberFormat('en-BD', {
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
    name: 'Fahim Ahmed',
    kind: 'customer',
    email: 'fahim@events.dhaka',
    phone: '+880 1711 555142',
    company: 'Fahim Events',
    balance: 28500,
    tags: ['wedding', 'VIP'],
    notes: 'Bridal lehenga orders — high AOV',
    color: '#0284c7',
    lastActivity: '2d ago',
  },
  {
    id: 'p2',
    name: 'Rahman Traders',
    kind: 'customer',
    email: 'orders@rahmantraders.com',
    phone: '+880 1812 555199',
    company: 'Rahman Traders',
    balance: 64200,
    tags: ['B2B', 'wholesale'],
    notes: 'Monthly wholesale salwar sets for Gulshan outlet',
    color: '#0ea5e9',
    lastActivity: '3h ago',
  },
  {
    id: 'p3',
    name: 'Sadia Khan',
    kind: 'customer',
    email: 'sadia@studio.bd',
    phone: '+880 1911 555110',
    company: 'Studio SK',
    balance: 0,
    tags: ['photoshoot', 'custom'],
    notes: 'Custom saree for magazine shoot',
    color: '#fb7185',
    lastActivity: '1h ago',
  },
  {
    id: 'p4',
    name: 'Nabila Events',
    kind: 'customer',
    email: 'hello@nabilaevents.com',
    phone: '+880 1615 555177',
    company: 'Nabila Events',
    balance: 52000,
    tags: ['events'],
    notes: 'Reception guest favours — 80 pieces',
    color: '#fbbf24',
    lastActivity: '2d ago',
  },
  {
    id: 'p5',
    name: 'Lakeside Resort',
    kind: 'customer',
    email: 'manager@lakesideresort.bd',
    phone: '+880 1713 555133',
    company: 'Lakeside Resort',
    balance: 0,
    tags: ['wholesale'],
    notes: 'Staff uniform dupattas — sample approved',
    color: '#fdba74',
    lastActivity: '3d ago',
  },
  {
    id: 'p6',
    name: 'Banani Textiles',
    kind: 'vendor',
    email: 'orders@bananitextiles.com',
    phone: '+880 1714 555201',
    company: 'Banani Textiles',
    balance: -18500,
    tags: ['inventory'],
    notes: 'Primary fabric supplier — Net 15',
    color: '#14b8a6',
    lastActivity: '1d ago',
  },
  {
    id: 'p7',
    name: 'GreenPack BD',
    kind: 'vendor',
    email: 'billing@greenpack.bd',
    phone: '+880 1815 555288',
    company: 'GreenPack BD',
    balance: -6200,
    tags: ['packaging'],
    notes: 'Boutique gift bags & hangers',
    color: '#34d399',
    lastActivity: '4d ago',
  },
  {
    id: 'p8',
    name: 'DESCO Utilities',
    kind: 'vendor',
    email: 'pay@desco.org.bd',
    phone: '+880 9612 000000',
    company: 'DESCO',
    balance: -9800,
    tags: ['utilities'],
    notes: 'Shop electricity — Dhanmondi',
    color: '#5b6b7c',
    lastActivity: '5d ago',
  },
  {
    id: 'p9',
    name: 'Rafi Islam',
    kind: 'customer',
    email: 'rafi@email.com',
    phone: '+880 1716 555166',
    balance: 1200,
    tags: ['loyalty'],
    notes: 'Ramadan pre-order club member',
    color: '#38bdf8',
    lastActivity: 'Yesterday',
  },
]

/* ——— Seed invoices ——— */
export const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    number: 'INV-1042',
    customerId: 'p1',
    customerName: 'Fahim Ahmed',
    status: 'overdue',
    issueDate: '2026-06-20',
    dueDate: '2026-07-04',
    currency: 'BDT',
    items: [
      { id: 'li1', description: 'Bridal lehenga deposit — August wedding', qty: 1, unitPrice: 18000 },
      { id: 'li2', description: 'Custom embroidery sample set', qty: 1, unitPrice: 6500 },
      { id: 'li3', description: 'Delivery to Dhanmondi venue', qty: 1, unitPrice: 4000 },
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
    customerName: 'Rahman Traders',
    status: 'sent',
    issueDate: '2026-07-08',
    dueDate: '2026-07-22',
    currency: 'BDT',
    items: [
      { id: 'li1', description: 'Wholesale salwar set pack (40 pcs) — week of Jul 7', qty: 1, unitPrice: 48000 },
      { id: 'li2', description: 'Branded packaging add-on', qty: 1, unitPrice: 6200 },
    ],
    amountPaid: 0,
    notes: 'First standing wholesale invoice',
    freyaDrafted: true,
    reminderSent: false,
  },
  {
    id: 'inv3',
    number: 'INV-1044',
    customerId: 'p4',
    customerName: 'Nabila Events',
    status: 'viewed',
    issueDate: '2026-07-10',
    dueDate: '2026-07-24',
    currency: 'BDT',
    items: [
      { id: 'li1', description: 'Reception guest favours package — 80 guests', qty: 1, unitPrice: 52000 },
    ],
    amountPaid: 0,
    notes: 'Quote accepted — awaiting bKash / bank transfer',
    freyaDrafted: true,
    reminderSent: false,
  },
  {
    id: 'inv4',
    number: 'INV-1040',
    customerId: 'p3',
    customerName: 'Sadia Khan',
    status: 'paid',
    issueDate: '2026-06-28',
    dueDate: '2026-07-05',
    paidDate: '2026-07-03',
    currency: 'BDT',
    items: [
      { id: 'li1', description: 'Custom jamdani saree — photoshoot', qty: 1, unitPrice: 12500 },
    ],
    amountPaid: 12500,
    notes: 'Paid via bKash',
    freyaDrafted: false,
    reminderSent: false,
  },
  {
    id: 'inv5',
    number: 'INV-1041',
    customerId: 'p5',
    customerName: 'Lakeside Resort',
    status: 'partial',
    issueDate: '2026-07-01',
    dueDate: '2026-07-15',
    currency: 'BDT',
    items: [
      { id: 'li1', description: 'Staff uniform dupattas (12 pcs)', qty: 1, unitPrice: 9600 },
    ],
    amountPaid: 4000,
    notes: 'Partial — balance due',
    freyaDrafted: true,
    reminderSent: true,
  },
  {
    id: 'inv6',
    number: 'INV-1039',
    customerId: 'p1',
    customerName: 'Fahim Ahmed',
    status: 'overdue',
    issueDate: '2026-06-10',
    dueDate: '2026-06-24',
    currency: 'BDT',
    items: [
      { id: 'li1', description: 'Groom sherwani alterations', qty: 1, unitPrice: 8500 },
    ],
    amountPaid: 0,
    notes: 'Second overdue — chase together with INV-1042',
    freyaDrafted: false,
    reminderSent: true,
  },
  {
    id: 'inv7',
    number: 'INV-1038',
    customerId: 'p2',
    customerName: 'Rahman Traders',
    status: 'paid',
    issueDate: '2026-06-15',
    dueDate: '2026-06-29',
    paidDate: '2026-06-28',
    currency: 'BDT',
    items: [
      { id: 'li1', description: 'June wholesale — kurtis & bottoms', qty: 1, unitPrice: 38500 },
    ],
    amountPaid: 38500,
    notes: 'Bank transfer received',
    freyaDrafted: false,
    reminderSent: false,
  },
  {
    id: 'inv8',
    number: 'INV-1045',
    customerId: 'p9',
    customerName: 'Rafi Islam',
    status: 'draft',
    issueDate: '2026-07-15',
    dueDate: '2026-07-29',
    currency: 'BDT',
    items: [
      { id: 'li1', description: 'Ramadan pre-order club — monthly', qty: 1, unitPrice: 1200 },
    ],
    amountPaid: 0,
    notes: 'Draft — Freya ready to send',
    freyaDrafted: true,
    reminderSent: false,
  },
]

/* ——— Seed bills ——— */
export const SEED_BILLS: Bill[] = [
  {
    id: 'bill1',
    number: 'BILL-220',
    vendorId: 'p6',
    vendorName: 'Banani Textiles',
    status: 'overdue',
    issueDate: '2026-06-25',
    dueDate: '2026-07-10',
    category: 'Inventory',
    items: [
      { id: 'li1', description: 'Cotton & linen bolt mix', qty: 1, unitPrice: 14500 },
      { id: 'li2', description: 'Thread & notions', qty: 1, unitPrice: 2100 },
    ],
    amountPaid: 0,
    notes: 'Net 15 overdue — pay via Dutch-Bangla',
    freyaFlagged: true,
  },
  {
    id: 'bill2',
    number: 'BILL-221',
    vendorId: 'p7',
    vendorName: 'GreenPack BD',
    status: 'awaiting',
    issueDate: '2026-07-08',
    dueDate: '2026-07-22',
    category: 'Packaging',
    items: [{ id: 'li1', description: 'Gift bags (200) + hangers', qty: 1, unitPrice: 6200 }],
    amountPaid: 0,
    notes: '',
    freyaFlagged: false,
  },
  {
    id: 'bill3',
    number: 'BILL-222',
    vendorId: 'p8',
    vendorName: 'DESCO Utilities',
    status: 'scheduled',
    issueDate: '2026-07-01',
    dueDate: '2026-07-18',
    category: 'Utilities',
    items: [{ id: 'li1', description: 'July electricity — shop', qty: 1, unitPrice: 9800 }],
    amountPaid: 0,
    notes: 'Auto-pay scheduled',
    freyaFlagged: false,
  },
  {
    id: 'bill4',
    number: 'BILL-218',
    vendorId: 'p6',
    vendorName: 'Banani Textiles',
    status: 'paid',
    issueDate: '2026-06-05',
    dueDate: '2026-06-20',
    paidDate: '2026-06-19',
    category: 'Inventory',
    items: [{ id: 'li1', description: 'Silk blend for eid collection', qty: 1, unitPrice: 22000 }],
    amountPaid: 22000,
    notes: '',
    freyaFlagged: false,
  },
  {
    id: 'bill5',
    number: 'BILL-219',
    vendorId: 'p7',
    vendorName: 'GreenPack BD',
    status: 'draft',
    issueDate: '2026-07-14',
    dueDate: '2026-07-28',
    category: 'Packaging',
    items: [{ id: 'li1', description: 'Eid gift wrap roll stock', qty: 1, unitPrice: 3500 }],
    amountPaid: 0,
    notes: 'Freya drafted from receipt photo',
    freyaFlagged: true,
  },
]

/* ——— Seed expenses ——— */
export const SEED_EXPENSES: Expense[] = [
  {
    id: 'ex1',
    merchant: 'Meta Ads',
    date: '2026-07-14',
    amount: 4500,
    category: 'Marketing',
    status: 'needs-review',
    accountId: 'ba1',
    receipt: false,
    notes: 'Boost for new kurti drop',
    freyaSuggestedCategory: 'Marketing',
    submittedBy: 'Nusrat',
  },
  {
    id: 'ex2',
    merchant: 'Pathao',
    date: '2026-07-13',
    amount: 280,
    category: 'Delivery',
    status: 'needs-review',
    accountId: 'ba3',
    receipt: true,
    notes: 'Sample drop to Rahman Traders',
    freyaSuggestedCategory: 'Delivery',
    submittedBy: 'Nusrat',
  },
  {
    id: 'ex3',
    merchant: 'Aarong Craft Fair stall',
    date: '2026-07-12',
    amount: 2500,
    category: 'Marketing',
    status: 'needs-review',
    accountId: 'ba1',
    receipt: true,
    notes: 'Weekend pop-up fee',
    freyaSuggestedCategory: 'Marketing',
    submittedBy: 'Nusrat',
  },
  {
    id: 'ex4',
    merchant: 'Sewing machine parts — New Market',
    date: '2026-07-09',
    amount: 3200,
    category: 'Equipment',
    status: 'approved',
    accountId: 'ba3',
    receipt: true,
    notes: '',
    submittedBy: 'Nusrat',
  },
  {
    id: 'ex5',
    merchant: 'bKash cash-out fee',
    date: '2026-07-08',
    amount: 50,
    category: 'Other',
    status: 'approved',
    accountId: 'ba2',
    receipt: false,
    notes: '',
    submittedBy: 'Freya',
  },
  {
    id: 'ex6',
    merchant: 'Shop rent — Dhanmondi',
    date: '2026-07-01',
    amount: 45000,
    category: 'Rent',
    status: 'reimbursed',
    accountId: 'ba1',
    receipt: true,
    notes: 'July rent',
    submittedBy: 'Nusrat',
  },
  {
    id: 'ex7',
    merchant: 'DESCO duplicate charge',
    date: '2026-07-02',
    amount: 500,
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
    institution: 'Dutch-Bangla Bank',
    type: 'checking',
    currency: 'BDT',
    balance: 485000,
    lastSynced: 'Just now',
    color: '#0284c7',
  },
  {
    id: 'ba2',
    name: 'bKash Business',
    institution: 'bKash',
    type: 'savings',
    currency: 'BDT',
    balance: 68500,
    lastSynced: '1h ago',
    color: '#e2136e',
  },
  {
    id: 'ba3',
    name: 'Nagad Merchant',
    institution: 'Nagad',
    type: 'card',
    currency: 'BDT',
    balance: 24200,
    lastSynced: 'Just now',
    color: '#f59e0b',
  },
  {
    id: 'ba4',
    name: 'Cash till',
    institution: 'Cash',
    type: 'checking',
    currency: 'BDT',
    balance: 18500,
    lastSynced: 'Just now',
    color: '#34d399',
  },
]

/* ——— Bank transactions ——— */
export const SEED_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'tx1',
    accountId: 'ba2',
    date: '2026-07-15',
    description: 'bKash * NUSRAT BOUTIQUE',
    amount: 12500,
    direction: 'in',
    status: 'matched',
    category: 'Sales',
    matchedTo: { type: 'invoice', id: 'inv4', label: 'INV-1040 Sadia' },
    freyaMatchConfidence: 96,
  },
  {
    id: 'tx2',
    accountId: 'ba1',
    date: '2026-07-14',
    description: 'META PLATFORMS ADS',
    amount: 4500,
    direction: 'out',
    status: 'unmatched',
    freyaMatchConfidence: 88,
  },
  {
    id: 'tx3',
    accountId: 'ba1',
    date: '2026-07-13',
    description: 'BANANI TEXTILES ACH',
    amount: 22000,
    direction: 'out',
    status: 'matched',
    category: 'Inventory',
    matchedTo: { type: 'bill', id: 'bill4', label: 'BILL-218 Banani' },
    freyaMatchConfidence: 99,
  },
  {
    id: 'tx4',
    accountId: 'ba1',
    date: '2026-07-12',
    description: 'NAGAD SETTLEMENT',
    amount: 28500,
    direction: 'in',
    status: 'reconciled',
    category: 'Sales',
    matchedTo: { type: 'invoice', id: 'inv7', label: 'INV-1038 Rahman' },
    freyaMatchConfidence: 97,
  },
  {
    id: 'tx5',
    accountId: 'ba3',
    date: '2026-07-13',
    description: 'PATHAO *TRIP',
    amount: 280,
    direction: 'out',
    status: 'unmatched',
    freyaMatchConfidence: 72,
  },
  {
    id: 'tx6',
    accountId: 'ba1',
    date: '2026-07-12',
    description: 'AARONG CRAFT FAIR',
    amount: 2500,
    direction: 'out',
    status: 'unmatched',
    freyaMatchConfidence: 81,
  },
  {
    id: 'tx7',
    accountId: 'ba1',
    date: '2026-07-10',
    description: 'TRANSFER TO BKASH',
    amount: 15000,
    direction: 'out',
    status: 'reconciled',
    category: 'Transfer',
  },
  {
    id: 'tx8',
    accountId: 'ba2',
    date: '2026-07-10',
    description: 'TRANSFER FROM DBBL',
    amount: 15000,
    direction: 'in',
    status: 'reconciled',
    category: 'Transfer',
  },
  {
    id: 'tx9',
    accountId: 'ba1',
    date: '2026-07-09',
    description: 'LAKESIDE RESORT NAGAD',
    amount: 4000,
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
    description: 'NEW MARKET PARTS',
    amount: 3200,
    direction: 'out',
    status: 'matched',
    category: 'Equipment',
    matchedTo: { type: 'expense', id: 'ex4', label: 'Sewing parts' },
    freyaMatchConfidence: 91,
  },
  {
    id: 'tx11',
    accountId: 'ba1',
    date: '2026-07-08',
    description: 'UNKNOWN NAGAD DEBIT',
    amount: 490,
    direction: 'out',
    status: 'unmatched',
    freyaMatchConfidence: 40,
  },
  {
    id: 'tx12',
    accountId: 'ba4',
    date: '2026-07-06',
    description: 'CASH SALE — WALK-IN',
    amount: 6800,
    direction: 'in',
    status: 'reconciled',
    category: 'Sales',
  },
]

/* ——— Chart of accounts (watchlist) ——— */
export const SEED_LEDGER: LedgerAccount[] = [
  { id: 'la1', code: '1000', name: 'Dutch-Bangla Checking', type: 'asset', balance: 485000, watchlist: true },
  { id: 'la2', code: '1100', name: 'bKash Business', type: 'asset', balance: 68500, watchlist: true },
  { id: 'la3', code: '1200', name: 'Nagad Merchant', type: 'asset', balance: 24200, watchlist: true },
  { id: 'la4', code: '1300', name: 'Cash till', type: 'asset', balance: 18500, watchlist: true },
  {
    id: 'la5',
    code: '4000',
    name: 'Retail sales',
    type: 'income',
    balance: 312000,
    budgetMonthly: 350000,
    watchlist: true,
  },
  {
    id: 'la6',
    code: '4100',
    name: 'Wholesale & events',
    type: 'income',
    balance: 186000,
    budgetMonthly: 160000,
    watchlist: true,
  },
  {
    id: 'la7',
    code: '5000',
    name: 'Inventory',
    type: 'expense',
    balance: 98000,
    budgetMonthly: 110000,
    watchlist: true,
  },
  {
    id: 'la8',
    code: '5100',
    name: 'Marketing',
    type: 'expense',
    balance: 18500,
    budgetMonthly: 15000,
    watchlist: true,
  },
  {
    id: 'la9',
    code: '5200',
    name: 'Rent',
    type: 'expense',
    balance: 45000,
    budgetMonthly: 45000,
    watchlist: false,
  },
  {
    id: 'la10',
    code: '5300',
    name: 'Payroll',
    type: 'expense',
    balance: 72000,
    budgetMonthly: 75000,
    watchlist: true,
  },
  { id: 'la11', code: '3000', name: 'Owner equity', type: 'equity', balance: 520000, watchlist: false },
]

export const SEED_CASHFLOW: CashMonth[] = [
  { month: 'Feb', cashIn: 285000, cashOut: 242000 },
  { month: 'Mar', cashIn: 312000, cashOut: 258000 },
  { month: 'Apr', cashIn: 298000, cashOut: 271000 },
  { month: 'May', cashIn: 345000, cashOut: 289000 },
  { month: 'Jun', cashIn: 368000, cashOut: 305000 },
  { month: 'Jul', cashIn: 198000, cashOut: 152000 },
]

export const SEED_INSIGHTS: MoneyInsight[] = [
  {
    id: 'mi1',
    tone: 'risk',
    title: '2 invoices overdue — ৳37,000 sitting out',
    body: 'Fahim Ahmed still owes INV-1042 and INV-1039. Cash gets tighter if we wait past 30 days.',
    actionLabel: 'Chase with Freya',
    actionKind: 'chase',
  },
  {
    id: 'mi2',
    tone: 'action',
    title: '3 bank transactions need a match',
    body: 'Meta Ads, Pathao, and an unknown Nagad debit are waiting. I can categorize them in one tap.',
    actionLabel: 'Review matches',
    actionKind: 'reconcile',
  },
  {
    id: 'mi3',
    tone: 'action',
    title: 'Banani Textiles bill is overdue',
    body: 'BILL-220 (৳16,600) passed Net 15. Paying today keeps the supplier relationship healthy.',
    actionLabel: 'Schedule payment',
    actionKind: 'pay-bills',
  },
  {
    id: 'mi4',
    tone: 'win',
    title: 'Wholesale income beat budget',
    body: 'Events & wholesale revenue is ৳26,000 above this month’s plan — mostly Rahman Traders and Nabila Events.',
    actionLabel: 'See P&L',
  },
  {
    id: 'mi5',
    tone: 'info',
    title: 'Draft loyalty invoice ready',
    body: 'Rafi Islam renewed the Ramadan pre-order club. INV-1045 is drafted — approve and send when you’re ready.',
    actionLabel: 'Open draft',
    actionKind: 'invoice',
  },
  {
    id: 'mi6',
    tone: 'risk',
    title: 'Marketing spend over budget',
    body: 'Marketing is at ৳18,500 vs ৳15,000 plan. Meta Ads and the Aarong craft fair stall drove it.',
    actionLabel: 'Review expenses',
    actionKind: 'categorize',
  },
]

