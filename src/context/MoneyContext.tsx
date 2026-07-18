import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  SEED_ACCOUNTS,
  SEED_BILLS,
  SEED_CASHFLOW,
  SEED_EXPENSES,
  SEED_INSIGHTS,
  SEED_INVOICES,
  SEED_LEDGER,
  SEED_PARTIES,
  SEED_TRANSACTIONS,
  billBalance,
  docTotal,
  invoiceBalance,
  type BankAccount,
  type BankTransaction,
  type Bill,
  type BillStatus,
  type CashMonth,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
  type Invoice,
  type InvoiceStatus,
  type LedgerAccount,
  type MoneyInsight,
  type MoneyParty,
} from '../data/moneyData'

const STORAGE_KEY = 'antarious-money-v1'

interface StoredMoney {
  parties: MoneyParty[]
  invoices: Invoice[]
  bills: Bill[]
  expenses: Expense[]
  accounts: BankAccount[]
  transactions: BankTransaction[]
  ledger: LedgerAccount[]
  cashflow: CashMonth[]
  insights: MoneyInsight[]
  nextInvoiceNum: number
  nextBillNum: number
}

function defaults(): StoredMoney {
  return {
    parties: structuredClone(SEED_PARTIES),
    invoices: structuredClone(SEED_INVOICES),
    bills: structuredClone(SEED_BILLS),
    expenses: structuredClone(SEED_EXPENSES),
    accounts: structuredClone(SEED_ACCOUNTS),
    transactions: structuredClone(SEED_TRANSACTIONS),
    ledger: structuredClone(SEED_LEDGER),
    cashflow: structuredClone(SEED_CASHFLOW),
    insights: structuredClone(SEED_INSIGHTS),
    nextInvoiceNum: 1046,
    nextBillNum: 224,
  }
}

function load(): StoredMoney {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<StoredMoney>
    const base = defaults()
    return {
      parties: parsed.parties?.length ? parsed.parties : base.parties,
      invoices: parsed.invoices?.length ? parsed.invoices : base.invoices,
      bills: parsed.bills?.length ? parsed.bills : base.bills,
      expenses: parsed.expenses?.length ? parsed.expenses : base.expenses,
      accounts: parsed.accounts?.length ? parsed.accounts : base.accounts,
      transactions: parsed.transactions?.length ? parsed.transactions : base.transactions,
      ledger: parsed.ledger?.length ? parsed.ledger : base.ledger,
      cashflow: parsed.cashflow?.length ? parsed.cashflow : base.cashflow,
      insights: parsed.insights?.length ? parsed.insights : base.insights,
      nextInvoiceNum: parsed.nextInvoiceNum ?? base.nextInvoiceNum,
      nextBillNum: parsed.nextBillNum ?? base.nextBillNum,
    }
  } catch {
    return defaults()
  }
}

function save(data: StoredMoney) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export interface CreateInvoiceInput {
  customerId: string
  customerName: string
  dueDate: string
  description: string
  amount: number
  notes?: string
}

export interface CreateBillInput {
  vendorId: string
  vendorName: string
  dueDate: string
  category: ExpenseCategory
  description: string
  amount: number
}

export interface CreateExpenseInput {
  merchant: string
  amount: number
  category: ExpenseCategory
  date: string
  accountId: string
  notes?: string
}

interface MoneyContextValue {
  parties: MoneyParty[]
  invoices: Invoice[]
  bills: Bill[]
  expenses: Expense[]
  accounts: BankAccount[]
  transactions: BankTransaction[]
  ledger: LedgerAccount[]
  cashflow: CashMonth[]
  insights: MoneyInsight[]
  selectedInvoiceId: string | null
  selectedBillId: string | null
  selectInvoice: (id: string | null) => void
  selectBill: (id: string | null) => void
  // summaries
  cashPosition: number
  invoicesOwed: number
  billsToPay: number
  overdueInvoices: Invoice[]
  overdueBills: Bill[]
  unmatchedCount: number
  needsReviewCount: number
  monthIncome: number
  monthExpenses: number
  netProfit: number
  // actions
  createInvoice: (input: CreateInvoiceInput) => Invoice
  updateInvoice: (id: string, patch: Partial<Invoice>) => void
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void
  markInvoicePaid: (id: string) => void
  sendInvoice: (id: string) => void
  chaseOverdue: () => number
  createBill: (input: CreateBillInput) => Bill
  updateBill: (id: string, patch: Partial<Bill>) => void
  setBillStatus: (id: string, status: BillStatus) => void
  markBillPaid: (id: string) => void
  createExpense: (input: CreateExpenseInput) => Expense
  setExpenseStatus: (id: string, status: ExpenseStatus) => void
  approveExpenseCategory: (id: string) => void
  matchTransaction: (txnId: string) => void
  reconcileTransaction: (txnId: string) => void
  excludeTransaction: (txnId: string) => void
  freyaAutoMatch: () => number
  freyaCategorizeExpenses: () => number
  dismissInsight: (id: string) => void
  resetDemo: () => void
}

const MoneyContext = createContext<MoneyContextValue | null>(null)

export function MoneyProvider({ children }: { children: ReactNode }) {
  const initial = load()
  const [data, setData] = useState<StoredMoney>(initial)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)

  const persist = useCallback((updater: (prev: StoredMoney) => StoredMoney) => {
    setData((prev) => {
      const next = updater(prev)
      save(next)
      return next
    })
  }, [])

  const cashPosition = useMemo(
    () => data.accounts.reduce((s, a) => s + a.balance, 0),
    [data.accounts],
  )

  const invoicesOwed = useMemo(
    () =>
      data.invoices
        .filter((i) => !['paid', 'void', 'draft'].includes(i.status))
        .reduce((s, i) => s + invoiceBalance(i), 0),
    [data.invoices],
  )

  const billsToPay = useMemo(
    () =>
      data.bills
        .filter((b) => !['paid', 'draft'].includes(b.status))
        .reduce((s, b) => s + billBalance(b), 0),
    [data.bills],
  )

  const overdueInvoices = useMemo(
    () => data.invoices.filter((i) => i.status === 'overdue' || (invoiceBalance(i) > 0 && i.status !== 'paid' && i.status !== 'void' && i.status !== 'draft' && new Date(i.dueDate) < new Date('2026-07-16'))),
    [data.invoices],
  )

  const overdueBills = useMemo(
    () => data.bills.filter((b) => b.status === 'overdue'),
    [data.bills],
  )

  const unmatchedCount = useMemo(
    () => data.transactions.filter((t) => t.status === 'unmatched').length,
    [data.transactions],
  )

  const needsReviewCount = useMemo(
    () => data.expenses.filter((e) => e.status === 'needs-review').length,
    [data.expenses],
  )

  const monthIncome = useMemo(() => {
    const paid = data.invoices
      .filter((i) => i.status === 'paid' || i.amountPaid > 0)
      .reduce((s, i) => s + (i.status === 'paid' ? docTotal(i.items) : i.amountPaid), 0)
    const salesTx = data.transactions
      .filter((t) => t.direction === 'in' && t.category === 'Sales' && t.date.startsWith('2026-07'))
      .reduce((s, t) => s + t.amount, 0)
    return Math.max(paid * 0.35 + salesTx, salesTx + 4200)
  }, [data.invoices, data.transactions])

  const monthExpenses = useMemo(() => {
    const billsPaid = data.bills
      .filter((b) => b.status === 'paid' && b.paidDate?.startsWith('2026-07'))
      .reduce((s, b) => s + docTotal(b.items), 0)
    const ex = data.expenses
      .filter((e) => e.status !== 'rejected' && e.date.startsWith('2026-07'))
      .reduce((s, e) => s + e.amount, 0)
    const out = data.transactions
      .filter((t) => t.direction === 'out' && t.date.startsWith('2026-07') && t.category !== 'Transfer')
      .reduce((s, t) => s + t.amount, 0)
    return Math.round((billsPaid + ex + out) / 2 + 2100)
  }, [data.bills, data.expenses, data.transactions])

  const netProfit = monthIncome - monthExpenses

  const createInvoice = useCallback(
    (input: CreateInvoiceInput) => {
      let created!: Invoice
      persist((prev) => {
        const num = prev.nextInvoiceNum
        created = {
          id: `inv${Date.now()}`,
          number: `INV-${num}`,
          customerId: input.customerId,
          customerName: input.customerName,
          status: 'draft',
          issueDate: '2026-07-16',
          dueDate: input.dueDate,
          currency: 'USD',
          items: [
            {
              id: `li${Date.now()}`,
              description: input.description,
              qty: 1,
              unitPrice: input.amount,
            },
          ],
          amountPaid: 0,
          notes: input.notes || '',
          freyaDrafted: true,
          reminderSent: false,
        }
        return {
          ...prev,
          invoices: [created, ...prev.invoices],
          nextInvoiceNum: num + 1,
        }
      })
      setSelectedInvoiceId(created.id)
      return created
    },
    [persist],
  )

  const updateInvoice = useCallback(
    (id: string, patch: Partial<Invoice>) => {
      persist((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }))
    },
    [persist],
  )

  const setInvoiceStatus = useCallback(
    (id: string, status: InvoiceStatus) => {
      updateInvoice(id, { status })
    },
    [updateInvoice],
  )

  const markInvoicePaid = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => {
          if (i.id !== id) return i
          const total = docTotal(i.items)
          return {
            ...i,
            status: 'paid' as const,
            amountPaid: total,
            paidDate: '2026-07-16',
          }
        }),
        parties: prev.parties.map((p) => {
          const inv = prev.invoices.find((i) => i.id === id)
          if (!inv || p.id !== inv.customerId) return p
          return { ...p, balance: Math.max(0, p.balance - invoiceBalance(inv)), lastActivity: 'Just now' }
        }),
      }))
    },
    [persist],
  )

  const sendInvoice = useCallback(
    (id: string) => {
      updateInvoice(id, { status: 'sent' })
    },
    [updateInvoice],
  )

  const chaseOverdue = useCallback(() => {
    let count = 0
    persist((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) => {
        if (i.status !== 'overdue' && !(invoiceBalance(i) > 0 && i.status !== 'paid' && i.status !== 'draft' && new Date(i.dueDate) < new Date('2026-07-16'))) {
          return i
        }
        if (i.reminderSent) return i
        count += 1
        return { ...i, reminderSent: true, status: 'overdue' as const }
      }),
    }))
    return count
  }, [persist])

  const createBill = useCallback(
    (input: CreateBillInput) => {
      let created!: Bill
      persist((prev) => {
        const num = prev.nextBillNum
        created = {
          id: `bill${Date.now()}`,
          number: `BILL-${num}`,
          vendorId: input.vendorId,
          vendorName: input.vendorName,
          status: 'awaiting',
          issueDate: '2026-07-16',
          dueDate: input.dueDate,
          category: input.category,
          items: [
            {
              id: `li${Date.now()}`,
              description: input.description,
              qty: 1,
              unitPrice: input.amount,
            },
          ],
          amountPaid: 0,
          notes: '',
          freyaFlagged: false,
        }
        return { ...prev, bills: [created, ...prev.bills], nextBillNum: num + 1 }
      })
      setSelectedBillId(created.id)
      return created
    },
    [persist],
  )

  const updateBill = useCallback(
    (id: string, patch: Partial<Bill>) => {
      persist((prev) => ({
        ...prev,
        bills: prev.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      }))
    },
    [persist],
  )

  const setBillStatus = useCallback(
    (id: string, status: BillStatus) => {
      updateBill(id, { status })
    },
    [updateBill],
  )

  const markBillPaid = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        bills: prev.bills.map((b) => {
          if (b.id !== id) return b
          return {
            ...b,
            status: 'paid' as const,
            amountPaid: docTotal(b.items),
            paidDate: '2026-07-16',
          }
        }),
      }))
    },
    [persist],
  )

  const createExpense = useCallback(
    (input: CreateExpenseInput) => {
      let created!: Expense
      persist((prev) => {
        created = {
          id: `ex${Date.now()}`,
          merchant: input.merchant,
          date: input.date,
          amount: input.amount,
          category: input.category,
          status: 'needs-review',
          accountId: input.accountId,
          receipt: false,
          notes: input.notes || '',
          freyaSuggestedCategory: input.category,
          submittedBy: 'Joy',
        }
        return { ...prev, expenses: [created, ...prev.expenses] }
      })
      return created
    },
    [persist],
  )

  const setExpenseStatus = useCallback(
    (id: string, status: ExpenseStatus) => {
      persist((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === id ? { ...e, status } : e)),
      }))
    },
    [persist],
  )

  const approveExpenseCategory = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => {
          if (e.id !== id) return e
          return {
            ...e,
            category: e.freyaSuggestedCategory || e.category,
            status: 'approved' as const,
          }
        }),
      }))
    },
    [persist],
  )

  const matchTransaction = useCallback(
    (txnId: string) => {
      persist((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => {
          if (t.id !== txnId) return t
          const expense = prev.expenses.find(
            (e) => Math.abs(e.amount - t.amount) < 1 && e.status === 'needs-review',
          )
          if (expense) {
            return {
              ...t,
              status: 'matched' as const,
              category: expense.category,
              matchedTo: { type: 'expense' as const, id: expense.id, label: expense.merchant },
              freyaMatchConfidence: 92,
            }
          }
          return {
            ...t,
            status: 'matched' as const,
            category: t.direction === 'in' ? 'Sales' : 'Other',
            freyaMatchConfidence: 80,
            matchedTo: {
              type: 'expense' as const,
              id: 'manual',
              label: t.direction === 'in' ? 'Sales income' : 'Operating expense',
            },
          }
        }),
      }))
    },
    [persist],
  )

  const reconcileTransaction = useCallback(
    (txnId: string) => {
      persist((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === txnId ? { ...t, status: 'reconciled' as const } : t,
        ),
      }))
    },
    [persist],
  )

  const excludeTransaction = useCallback(
    (txnId: string) => {
      persist((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === txnId ? { ...t, status: 'excluded' as const } : t,
        ),
      }))
    },
    [persist],
  )

  const freyaAutoMatch = useCallback(() => {
    let count = 0
    persist((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => {
        if (t.status !== 'unmatched') return t
        if ((t.freyaMatchConfidence ?? 0) < 70) return t
        count += 1
        const expense = prev.expenses.find((e) => Math.abs(e.amount - t.amount) < 1)
        return {
          ...t,
          status: 'matched' as const,
          category: expense?.category || (t.direction === 'in' ? 'Sales' : 'Other'),
          matchedTo: expense
            ? { type: 'expense' as const, id: expense.id, label: expense.merchant }
            : {
                type: 'expense' as const,
                id: 'auto',
                label: t.direction === 'in' ? 'Sales (Freya)' : `${t.description.slice(0, 24)} (Freya)`,
              },
        }
      }),
    }))
    return count
  }, [persist])

  const freyaCategorizeExpenses = useCallback(() => {
    let count = 0
    persist((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => {
        if (e.status !== 'needs-review') return e
        count += 1
        return {
          ...e,
          category: e.freyaSuggestedCategory || e.category,
          status: 'approved' as const,
        }
      }),
    }))
    return count
  }, [persist])

  const dismissInsight = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        insights: prev.insights.filter((i) => i.id !== id),
      }))
    },
    [persist],
  )

  const resetDemo = useCallback(() => {
    const fresh = defaults()
    save(fresh)
    setData(fresh)
    setSelectedInvoiceId(null)
    setSelectedBillId(null)
  }, [])

  const value = useMemo(
    () => ({
      parties: data.parties,
      invoices: data.invoices,
      bills: data.bills,
      expenses: data.expenses,
      accounts: data.accounts,
      transactions: data.transactions,
      ledger: data.ledger,
      cashflow: data.cashflow,
      insights: data.insights,
      selectedInvoiceId,
      selectedBillId,
      selectInvoice: setSelectedInvoiceId,
      selectBill: setSelectedBillId,
      cashPosition,
      invoicesOwed,
      billsToPay,
      overdueInvoices,
      overdueBills,
      unmatchedCount,
      needsReviewCount,
      monthIncome,
      monthExpenses,
      netProfit,
      createInvoice,
      updateInvoice,
      setInvoiceStatus,
      markInvoicePaid,
      sendInvoice,
      chaseOverdue,
      createBill,
      updateBill,
      setBillStatus,
      markBillPaid,
      createExpense,
      setExpenseStatus,
      approveExpenseCategory,
      matchTransaction,
      reconcileTransaction,
      excludeTransaction,
      freyaAutoMatch,
      freyaCategorizeExpenses,
      dismissInsight,
      resetDemo,
    }),
    [
      data,
      selectedInvoiceId,
      selectedBillId,
      cashPosition,
      invoicesOwed,
      billsToPay,
      overdueInvoices,
      overdueBills,
      unmatchedCount,
      needsReviewCount,
      monthIncome,
      monthExpenses,
      netProfit,
      createInvoice,
      updateInvoice,
      setInvoiceStatus,
      markInvoicePaid,
      sendInvoice,
      chaseOverdue,
      createBill,
      updateBill,
      setBillStatus,
      markBillPaid,
      createExpense,
      setExpenseStatus,
      approveExpenseCategory,
      matchTransaction,
      reconcileTransaction,
      excludeTransaction,
      freyaAutoMatch,
      dismissInsight,
      freyaCategorizeExpenses,
      resetDemo,
    ],
  )

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>
}

export function useMoney() {
  const ctx = useContext(MoneyContext)
  if (!ctx) throw new Error('useMoney must be used within MoneyProvider')
  return ctx
}
