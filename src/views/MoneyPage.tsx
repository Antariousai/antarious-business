import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Avatar } from '../components/Avatar'
import {
  Button,
  FieldInput,
  Modal,
  Page,
  PageHeader,
  Pill,
  SegmentedControl,
  StatCard,
  Tabs,
  statusTone,
} from '../components/ui'
import { FreyaCreationAssist } from '../components/FreyaCreationAssist'
import { useApp } from '../context/AppContext'
import { useMoney } from '../context/MoneyContext'
import { freyaFillBill, freyaFillExpense, freyaFillInvoice } from '../lib/freyaCreationHelpers'
import {
  EXPENSE_CATEGORIES,
  agingBucket,
  billBalance,
  billStatusMeta,
  docTotal,
  formatMoney,
  formatMoneyExact,
  invoiceBalance,
  invoiceStatusMeta,
  lineTotal,
  type Bill,
  type BillStatus,
  type CashMonth,
  type Expense,
  type ExpenseCategory,
  type Invoice,
  type InvoiceStatus,
  type MoneyInsight,
  type MoneyParty,
  type TxnStatus,
} from '../data/moneyData'

type MoneyTab = 'overview' | 'invoices' | 'bills' | 'bank' | 'contacts' | 'reports' | 'freya'
type InvoiceFilter = 'all' | 'draft' | 'open' | 'paid' | 'overdue'
type BillFilter = 'all' | BillStatus
type BillsSub = 'bills' | 'expenses'
type BankFilter = 'all' | TxnStatus
type ContactKind = 'customer' | 'vendor'

const OPEN_INVOICE: InvoiceStatus[] = ['sent', 'viewed', 'partial', 'overdue']

function formatShortDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MoneyPage() {
  const money = useMoney()
  const { entitlements } = useApp()
  const [tab, setTab] = useState<MoneyTab>('overview')

  const moneyTabs = (
    [
      { id: 'overview' as const, label: 'This week', icon: Wallet, deep: false },
      { id: 'invoices' as const, label: 'To collect', icon: FileText, deep: false },
      { id: 'bills' as const, label: 'To pay', icon: Receipt, deep: true },
      { id: 'bank' as const, label: 'Bank', icon: Landmark, deep: true },
      { id: 'contacts' as const, label: 'Contacts', icon: Users, deep: true },
      { id: 'reports' as const, label: 'Reports', icon: TrendingUp, deep: true },
      { id: 'freya' as const, label: 'Freya', icon: Sparkles, deep: false },
    ] as const
  ).filter((t) => entitlements.deepMoney || !t.deep)

  function go(next: MoneyTab) {
    if (!moneyTabs.some((t) => t.id === next)) {
      setTab('overview')
      return
    }
    setTab(next)
  }

  const selectedInvoice =
    money.invoices.find((i) => i.id === money.selectedInvoiceId) || null
  const selectedBill = money.bills.find((b) => b.id === money.selectedBillId) || null

  return (
    <Page fill>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <PageHeader
          title="Money"
          subtitle="To collect, this week, and Freya draft bills — keep it tidy."
          badge={
            <span className="rounded-full bg-gradient-to-r from-emerald-500 to-mint px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm shadow-emerald-300/40">
              Freya helps
            </span>
          }
          action={
            <Button variant="secondary" size="sm" onClick={() => money.resetDemo()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Reset demo
            </Button>
          }
          tabs={
            <Tabs
              value={tab}
              onChange={go}
              options={moneyTabs.map((t) => ({
                id: t.id,
                label: t.label,
                icon: t.icon,
                badge:
                  t.id === 'invoices' && money.overdueInvoices.length > 0 ? (
                    <span className="ml-0.5 rounded-full bg-coral px-1.5 text-[10px] text-white">
                      {money.overdueInvoices.length}
                    </span>
                  ) : t.id === 'bank' && money.unmatchedCount > 0 ? (
                    <span className="ml-0.5 rounded-full bg-sky px-1.5 text-[10px] text-white">
                      {money.unmatchedCount}
                    </span>
                  ) : t.id === 'bills' && money.needsReviewCount > 0 ? (
                    <span className="ml-0.5 rounded-full bg-sunshine px-1.5 text-[10px] text-navy-deep">
                      {money.needsReviewCount}
                    </span>
                  ) : undefined,
              }))}
            />
          }
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === 'overview' && (
            <OverviewTab
              onGoInvoices={() => go('invoices')}
              onGoBills={() => go('bills')}
              onGoBank={() => go('bank')}
              onGoReports={() => go('reports')}
              onGoFreya={() => go('freya')}
            />
          )}
          {tab === 'invoices' && <InvoicesTab />}
          {tab === 'bills' && <BillsTab />}
          {tab === 'bank' && <BankTab />}
          {tab === 'contacts' && <ContactsTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'freya' && (
            <FreyaTab
              onGoInvoices={() => go('invoices')}
              onGoBills={() => go('bills')}
              onGoBank={() => go('bank')}
              onGoReports={() => go('reports')}
            />
          )}
        </div>
      </div>

      {selectedInvoice && tab === 'invoices' && (
        <InvoiceDetail invoice={selectedInvoice} />
      )}
      {selectedBill && tab === 'bills' && <BillDetail bill={selectedBill} />}
    </Page>
  )
}

/* ——— Overview ——— */

function OverviewTab({
  onGoInvoices,
  onGoBills,
  onGoBank,
  onGoReports,
  onGoFreya,
}: {
  onGoInvoices: () => void
  onGoBills: () => void
  onGoBank: () => void
  onGoReports: () => void
  onGoFreya: () => void
}) {
  const money = useMoney()

  const aging = useMemo(() => {
    const buckets = { current: 0, '1-30': 0, '31-60': 0, '60+': 0 }
    for (const inv of money.invoices) {
      if (['paid', 'void', 'draft'].includes(inv.status)) continue
      const bal = invoiceBalance(inv)
      if (bal <= 0) continue
      buckets[agingBucket(inv.dueDate, inv.status)] += bal
    }
    return buckets
  }, [money.invoices])

  function runInsightAction(insight: MoneyInsight) {
    switch (insight.actionKind) {
      case 'chase':
        money.chaseOverdue()
        onGoInvoices()
        break
      case 'reconcile':
        money.freyaAutoMatch()
        onGoBank()
        break
      case 'pay-bills':
        onGoBills()
        break
      case 'categorize':
        onGoBills()
        break
      case 'invoice':
        onGoInvoices()
        break
      default:
        onGoReports()
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5 pb-20">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cash position"
          value={formatMoney(money.cashPosition)}
          sub={`${money.accounts.length} accounts synced`}
          icon={Banknote}
          tone="sky"
        />
        <StatCard
          label="Money customers owe you"
          value={formatMoney(money.invoicesOwed)}
          sub={`${money.overdueInvoices.length} overdue`}
          icon={ArrowDownLeft}
          tone="navy"
        />
        <StatCard
          label="Bills to pay"
          value={formatMoney(money.billsToPay)}
          sub={`${money.overdueBills.length} overdue`}
          icon={ArrowUpRight}
          tone="amber"
        />
        <StatCard
          label="Net profit (Jul)"
          value={formatMoney(money.netProfit)}
          sub={`${formatMoney(money.monthIncome)} in · ${formatMoney(money.monthExpenses)} out`}
          icon={TrendingUp}
          tone="green"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <TaskChip
          label={`${money.overdueInvoices.length} overdue invoices`}
          tone="rose"
          onClick={onGoInvoices}
        />
        <TaskChip
          label={`${money.unmatchedCount} unmatched bank txns`}
          tone="sky"
          onClick={onGoBank}
        />
        <TaskChip
          label={`${money.needsReviewCount} expenses need review`}
          tone="amber"
          onClick={onGoBills}
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-sky/15 bg-gradient-to-br from-sky-soft/50 via-white to-rose-50/40 p-4 shadow-sm shadow-sky/10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">Cash in & out</h3>
            <button
              type="button"
              onClick={onGoReports}
              className="text-[12px] font-semibold text-sky"
            >
              Full report →
            </button>
          </div>
          <CashflowChart cashflow={money.cashflow} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-emerald-200/40 bg-gradient-to-br from-emerald-50/60 via-white to-mint/20 p-4 shadow-sm shadow-emerald-200/15">
          <h3 className="mb-3 text-[15px] font-bold text-ink">Bank accounts</h3>
          <div className="space-y-2">
            {money.accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={onGoBank}
                className="flex w-full items-center gap-3 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 text-left shadow-sm transition hover:border-sky/30 hover:bg-sky-soft/30"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{ background: a.color }}
                >
                  <CreditCard className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{a.name}</div>
                  <div className="text-[11px] text-muted">
                    {a.institution} · {a.type} · synced {a.lastSynced}
                  </div>
                </div>
                <div
                  className={`text-[14px] font-bold ${
                    a.balance < 0 ? 'text-rose-600' : 'text-ink'
                  }`}
                >
                  {formatMoneyExact(a.balance)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-sky/25 bg-gradient-to-br from-navy-deep via-navy-mid to-sky/80 p-4 text-white shadow-md shadow-navy/30">
          <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-sunshine/20 blur-2xl" />
          <div className="relative mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-bright to-sky-bright text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="text-[15px] font-bold">Freya digest</h3>
            </div>
            <button
              type="button"
              onClick={onGoFreya}
              className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-sky-soft hover:bg-white/25"
            >
              Open Freya →
            </button>
          </div>
          <div className="relative space-y-2">
            {money.insights.slice(0, 4).map((insight) => (
              <div
                key={insight.id}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm"
              >
                <div className="text-[13px] font-semibold text-white">{insight.title}</div>
                <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-300">{insight.body}</p>
                {insight.actionLabel && (
                  <button
                    type="button"
                    onClick={() => runInsightAction(insight)}
                    className="mt-2 rounded-full bg-gradient-to-r from-sky-bright to-sky px-3 py-1 text-[11px] font-bold text-white shadow-sm"
                  >
                    {insight.actionLabel}
                  </button>
                )}
              </div>
            ))}
            {!money.insights.length && (
              <p className="py-4 text-center text-[13px] text-slate-400">All quiet — books look good.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-50/50 via-white to-peach/30 p-4 shadow-sm shadow-amber-200/15">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">Aged receivables</h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Money still owed to you
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-amber-100/60 bg-white/70">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-gradient-to-r from-amber-50 to-peach/40 text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
                <tr>
                  <th className="px-3 py-2">Bucket</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['current', 'Current (not due)'],
                    ['1-30', '1–30 days late'],
                    ['31-60', '31–60 days late'],
                    ['60+', '60+ days late'],
                  ] as const
                ).map(([key, label]) => (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 font-medium text-ink">{label}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-ink">
                      {formatMoney(aging[key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ——— Invoices ——— */

function InvoicesTab() {
  const money = useMoney()
  const [filter, setFilter] = useState<InvoiceFilter>('all')
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)

  const filtered = useMemo(() => {
    return money.invoices.filter((inv) => {
      if (filter === 'draft' && inv.status !== 'draft') return false
      if (filter === 'paid' && inv.status !== 'paid') return false
      if (filter === 'overdue' && inv.status !== 'overdue') return false
      if (filter === 'open' && !OPEN_INVOICE.includes(inv.status)) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!`${inv.customerName} ${inv.number}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [money.invoices, filter, query])

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pt-4 pb-4">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'All' },
            { id: 'draft', label: 'Draft' },
            { id: 'open', label: 'Open' },
            { id: 'paid', label: 'Paid' },
            { id: 'overdue', label: 'Overdue' },
          ]}
        />
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer or number…"
            className="h-8 w-56 rounded-md border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-sky"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-sky px-3 py-2 text-[12px] font-bold text-white hover:bg-sky-bright"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          New invoice
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-2.5">Number</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Issue</th>
              <th className="px-4 py-2.5">Due</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5 text-right">Balance</th>
              <th className="px-4 py-2.5">Freya</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const meta = invoiceStatusMeta(inv.status)
              const selected = money.selectedInvoiceId === inv.id
              return (
                <tr
                  key={inv.id}
                  onClick={() => money.selectInvoice(inv.id)}
                  className={`cursor-pointer border-t border-slate-100 hover:bg-sky-soft/30 ${
                    selected ? 'bg-sky-soft/50' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-semibold text-ink">{inv.number}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar letter={inv.customerName[0]} size={28} />
                      <span className="font-medium text-ink">{inv.customerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Pill color={meta.color}>{meta.label}</Pill>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{formatShortDate(inv.issueDate)}</td>
                  <td className="px-4 py-2.5 text-muted">{formatShortDate(inv.dueDate)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ink">
                    {formatMoneyExact(docTotal(inv.items))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-ink">
                    {formatMoneyExact(invoiceBalance(inv))}
                  </td>
                  <td className="px-4 py-2.5">
                    {inv.freyaDrafted && (
                      <span className="rounded bg-sky-soft px-1.5 py-0.5 text-[10px] font-bold text-sky-bright">
                        Drafted
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">
                      {inv.status === 'draft' && (
                        <ActionBtn onClick={() => money.sendInvoice(inv.id)}>Send</ActionBtn>
                      )}
                      {!['paid', 'void'].includes(inv.status) && (
                        <ActionBtn onClick={() => money.markInvoicePaid(inv.id)}>Mark paid (bKash / cash)</ActionBtn>
                      )}
                      <ActionBtn onClick={() => money.selectInvoice(inv.id)}>Open</ActionBtn>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-muted">
                  No invoices match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && <NewInvoiceModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const money = useMoney()
  const meta = invoiceStatusMeta(invoice.status)
  const total = docTotal(invoice.items)
  const balance = invoiceBalance(invoice)

  return (
    <aside className="flex h-full w-full max-w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">Invoice</div>
          <h3 className="mt-0.5 text-[18px] font-bold text-ink">{invoice.number}</h3>
          <p className="text-[13px] text-muted">{invoice.customerName}</p>
        </div>
        <button
          type="button"
          onClick={() => money.selectInvoice(null)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill color={meta.color}>{meta.label}</Pill>
          {invoice.freyaDrafted && (
            <span className="rounded-md bg-sky-soft px-2 py-0.5 text-[11px] font-bold text-sky-bright">
              Freya drafted
            </span>
          )}
          {invoice.reminderSent && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              Reminder sent
            </span>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-semibold text-muted uppercase">Balance due</div>
          <div className="mt-1 text-[28px] font-bold text-ink">{formatMoneyExact(balance)}</div>
          <div className="text-[12px] text-muted">
            Total {formatMoneyExact(total)} · paid {formatMoneyExact(invoice.amountPaid)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <DetailField label="Issued" value={formatShortDate(invoice.issueDate)} />
          <DetailField label="Due" value={formatShortDate(invoice.dueDate)} />
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
            Line items
          </div>
          <div className="space-y-2">
            {invoice.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">{item.description}</div>
                  <div className="text-[11px] text-muted">
                    {item.qty} × {formatMoneyExact(item.unitPrice)}
                  </div>
                </div>
                <div className="shrink-0 text-[13px] font-bold text-ink">
                  {formatMoneyExact(lineTotal(item))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {invoice.notes && (
          <div>
            <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
              Notes
            </div>
            <p className="text-[13px] leading-relaxed text-slate-600">{invoice.notes}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
        {invoice.status === 'draft' && (
          <button
            type="button"
            onClick={() => money.sendInvoice(invoice.id)}
            className="rounded-md bg-sky px-3 py-2 text-[12px] font-bold text-white"
          >
            Send
          </button>
        )}
        {!['paid', 'void'].includes(invoice.status) && (
          <button
            type="button"
            onClick={() => money.markInvoicePaid(invoice.id)}
            className="rounded-md bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white"
          >
            Mark paid (bKash / bank)
          </button>
        )}
        {invoice.status !== 'void' && invoice.status !== 'paid' && (
          <button
            type="button"
            onClick={() => money.setInvoiceStatus(invoice.id, 'void')}
            className="rounded-md border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600"
          >
            Void
          </button>
        )}
        <button
          type="button"
          onClick={() => money.selectInvoice(null)}
          className="rounded-md px-3 py-2 text-[12px] font-semibold text-slate-500"
        >
          Close
        </button>
      </div>
    </aside>
  )
}

function NewInvoiceModal({ onClose }: { onClose: () => void }) {
  const money = useMoney()
  const customers = money.parties.filter((p) => p.kind === 'customer')
  const [prompt, setPrompt] = useState('')
  const [leaveToFreya, setLeaveToFreya] = useState(false)
  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('2026-07-30')
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

  function applySemiAuto() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillInvoice(prompt)
      setDescription(filled.description)
      setAmount(filled.amount)
      setApplying(false)
    }, 550)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const customer = customers.find((c) => c.id === customerId)
    if (!customer) return

    const filled = leaveToFreya ? freyaFillInvoice(prompt) : null
    const desc = (filled?.description || description).trim()
    const amt = Number(filled?.amount || amount)
    if (!desc || !amt) return

    setBuilding(true)
    window.setTimeout(() => {
      money.createInvoice({
        customerId: customer.id,
        customerName: customer.name,
        description: desc,
        amount: amt,
        dueDate,
      })
      setBuilding(false)
      onClose()
    }, leaveToFreya ? 500 : 0)
  }

  const canSubmit = leaveToFreya || (description.trim().length > 0 && Number(amount) > 0)
  const busy = applying || building

  return (
    <Modal title="New invoice" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <FreyaCreationAssist
          prompt={prompt}
          onPromptChange={setPrompt}
          leaveToFreya={leaveToFreya}
          onLeaveToFreyaChange={setLeaveToFreya}
          onApplyPrompt={applySemiAuto}
          applying={applying}
          disabled={busy}
          applyLabel="Freya, draft invoice from prompt"
          placeholder="e.g. Invoice for June wholesale — 40 kurtis, ৳48,000"
        />
        {leaveToFreya ? (
          <p className="rounded-lg bg-sky-soft/50 px-3 py-2.5 text-[12px] text-muted">
            Full auto — Freya drafts line items, amount, and description from your prompt.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <FieldInput label="Description" value={description} onChange={setDescription} required />
            <FieldInput label="Amount (৳)" value={amount} onChange={setAmount} required />
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              />
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="h-11 w-full rounded-lg bg-sky font-bold text-white disabled:bg-sky-muted"
        >
          {building ? 'Freya is drafting…' : leaveToFreya ? 'Let Freya create invoice' : 'Create invoice'}
        </button>
      </form>
    </Modal>
  )
}

/* ——— Bills & expenses ——— */

function BillsTab() {
  const money = useMoney()
  const [sub, setSub] = useState<BillsSub>('bills')
  const [filter, setFilter] = useState<BillFilter>('all')
  const [showNewBill, setShowNewBill] = useState(false)
  const [showNewExpense, setShowNewExpense] = useState(false)

  const filteredBills = useMemo(() => {
    return money.bills.filter((b) => (filter === 'all' ? true : b.status === filter))
  }, [money.bills, filter])

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pt-4 pb-4">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          {(
            [
              { id: 'bills', label: 'Bills' },
              { id: 'expenses', label: 'Expenses' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSub(s.id)}
              className={`rounded px-3 py-1.5 text-[12px] font-bold ${
                sub === s.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-ink'
              }`}
            >
              {s.label}
              {s.id === 'expenses' && money.needsReviewCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">
                  {money.needsReviewCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {sub === 'bills' && (
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'All' },
              { id: 'awaiting', label: 'Awaiting' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'paid', label: 'Paid' },
              { id: 'draft', label: 'Draft' },
            ]}
          />
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          {sub === 'expenses' && money.needsReviewCount > 0 && (
            <button
              type="button"
              onClick={() => money.freyaCategorizeExpenses()}
              className="inline-flex items-center gap-1.5 rounded-md bg-navy-mid px-3 py-2 text-[12px] font-bold text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Freya approve all reviews
            </button>
          )}
          {sub === 'bills' ? (
            <button
              type="button"
              onClick={() => setShowNewBill(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-sky px-3 py-2 text-[12px] font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              New bill
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewExpense(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-sky px-3 py-2 text-[12px] font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              New expense
            </button>
          )}
        </div>
      </div>

      {sub === 'bills' ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5">Number</th>
                <th className="px-4 py-2.5">Vendor</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 text-right">Balance</th>
                <th className="px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => {
                const meta = billStatusMeta(bill.status)
                const selected = money.selectedBillId === bill.id
                return (
                  <tr
                    key={bill.id}
                    onClick={() => money.selectBill(bill.id)}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-sky-soft/30 ${
                      selected ? 'bg-sky-soft/50' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        {bill.number}
                        {bill.freyaFlagged && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-ink">{bill.vendorName}</td>
                    <td className="px-4 py-2.5 text-muted">{bill.category}</td>
                    <td className="px-4 py-2.5">
                      <Pill color={meta.color}>{meta.label}</Pill>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{formatShortDate(bill.dueDate)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {formatMoneyExact(docTotal(bill.items))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold">
                      {formatMoneyExact(billBalance(bill))}
                    </td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {bill.status !== 'paid' && (
                        <ActionBtn onClick={() => money.markBillPaid(bill.id)}>Mark paid (bKash / cash)</ActionBtn>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!filteredBills.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-muted">
                    No bills in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <ExpensesTable expenses={money.expenses} />
      )}

      {showNewBill && <NewBillModal onClose={() => setShowNewBill(false)} />}
      {showNewExpense && <NewExpenseModal onClose={() => setShowNewExpense(false)} />}
    </div>
  )
}

function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  const money = useMoney()
  const accountName = (id: string) => money.accounts.find((a) => a.id === id)?.name || id

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
        <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold tracking-wide text-muted uppercase">
          <tr>
            <th className="px-4 py-2.5">Merchant</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Category</th>
            <th className="px-4 py-2.5">Account</th>
            <th className="px-4 py-2.5 text-right">Amount</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((ex) => {
            const needsReview = ex.status === 'needs-review'
            return (
              <tr
                key={ex.id}
                className={`border-t border-slate-100 ${
                  needsReview ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-ink">{ex.merchant}</div>
                  <div className="text-[11px] text-muted">by {ex.submittedBy}</div>
                </td>
                <td className="px-4 py-2.5 text-muted">{formatShortDate(ex.date)}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-ink">{ex.category}</div>
                  {needsReview && ex.freyaSuggestedCategory && (
                    <div className="text-[11px] text-sky-bright">
                      Freya suggests {ex.freyaSuggestedCategory}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted">{accountName(ex.accountId)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-ink">
                  {formatMoneyExact(ex.amount)}
                </td>
                <td className="px-4 py-2.5">
                  <Pill tone={statusTone("expense", ex.status)}>{ex.status === "needs-review" ? "Needs review" : ex.status === "approved" ? "Approved" : ex.status === "reimbursed" ? "Reimbursed" : "Rejected"}</Pill>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {needsReview && (
                      <ActionBtn onClick={() => money.approveExpenseCategory(ex.id)}>
                        Approve Freya
                      </ActionBtn>
                    )}
                    {ex.status !== 'approved' && ex.status !== 'reimbursed' && (
                      <ActionBtn onClick={() => money.setExpenseStatus(ex.id, 'approved')}>
                        Approve
                      </ActionBtn>
                    )}
                    {ex.status !== 'rejected' && (
                      <ActionBtn onClick={() => money.setExpenseStatus(ex.id, 'rejected')}>
                        Reject
                      </ActionBtn>
                    )}
                    {ex.status === 'approved' && (
                      <ActionBtn onClick={() => money.setExpenseStatus(ex.id, 'reimbursed')}>
                        Reimburse
                      </ActionBtn>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BillDetail({ bill }: { bill: Bill }) {
  const money = useMoney()
  const meta = billStatusMeta(bill.status)
  const total = docTotal(bill.items)
  const balance = billBalance(bill)

  return (
    <aside className="flex h-full w-full max-w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">Bill</div>
          <h3 className="mt-0.5 text-[18px] font-bold text-ink">{bill.number}</h3>
          <p className="text-[13px] text-muted">{bill.vendorName}</p>
        </div>
        <button
          type="button"
          onClick={() => money.selectBill(null)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill color={meta.color}>{meta.label}</Pill>
          {bill.freyaFlagged && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              Freya flagged
            </span>
          )}
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {bill.category}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-semibold text-muted uppercase">Still to pay</div>
          <div className="mt-1 text-[28px] font-bold text-ink">{formatMoneyExact(balance)}</div>
          <div className="text-[12px] text-muted">Total {formatMoneyExact(total)}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <DetailField label="Issued" value={formatShortDate(bill.issueDate)} />
          <DetailField label="Due" value={formatShortDate(bill.dueDate)} />
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
            Line items
          </div>
          <div className="space-y-2">
            {bill.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">{item.description}</div>
                  <div className="text-[11px] text-muted">
                    {item.qty} × {formatMoneyExact(item.unitPrice)}
                  </div>
                </div>
                <div className="shrink-0 text-[13px] font-bold text-ink">
                  {formatMoneyExact(lineTotal(item))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {bill.notes && (
          <div>
            <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
              Notes
            </div>
            <p className="text-[13px] leading-relaxed text-slate-600">{bill.notes}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
        {bill.status !== 'paid' && (
          <button
            type="button"
            onClick={() => money.markBillPaid(bill.id)}
            className="rounded-md bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white"
          >
            Mark paid (bKash / bank)
          </button>
        )}
        <button
          type="button"
          onClick={() => money.selectBill(null)}
          className="rounded-md px-3 py-2 text-[12px] font-semibold text-slate-500"
        >
          Close
        </button>
      </div>
    </aside>
  )
}

function NewBillModal({ onClose }: { onClose: () => void }) {
  const money = useMoney()
  const vendors = money.parties.filter((p) => p.kind === 'vendor')
  const [prompt, setPrompt] = useState('')
  const [leaveToFreya, setLeaveToFreya] = useState(false)
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '')
  const [category, setCategory] = useState<ExpenseCategory>('Inventory')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('2026-07-30')
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

  function applySemiAuto() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillBill(prompt)
      setDescription(filled.description)
      setAmount(filled.amount)
      setCategory(filled.category)
      setApplying(false)
    }, 550)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const vendor = vendors.find((v) => v.id === vendorId)
    if (!vendor) return

    const filled = leaveToFreya ? freyaFillBill(prompt) : null
    const desc = (filled?.description || description).trim()
    const amt = Number(filled?.amount || amount)
    if (!desc || !amt) return

    setBuilding(true)
    window.setTimeout(() => {
      money.createBill({
        vendorId: vendor.id,
        vendorName: vendor.name,
        category: filled?.category ?? category,
        description: desc,
        amount: amt,
        dueDate,
      })
      setBuilding(false)
      onClose()
    }, leaveToFreya ? 500 : 0)
  }

  const canSubmit = leaveToFreya || (description.trim().length > 0 && Number(amount) > 0)
  const busy = applying || building

  return (
    <Modal title="New bill" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <FreyaCreationAssist
          prompt={prompt}
          onPromptChange={setPrompt}
          leaveToFreya={leaveToFreya}
          onLeaveToFreyaChange={setLeaveToFreya}
          onApplyPrompt={applySemiAuto}
          applying={applying}
          disabled={busy}
          applyLabel="Freya, draft bill from prompt"
          placeholder="e.g. Banani Textiles invoice for July — fabric, ~৳16,600"
        />
        {leaveToFreya ? (
          <p className="rounded-lg bg-sky-soft/50 px-3 py-2.5 text-[12px] text-muted">
            Full auto — Freya categorizes and fills the bill from your prompt.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">Vendor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <FieldInput label="Description" value={description} onChange={setDescription} required />
            <FieldInput label="Amount (৳)" value={amount} onChange={setAmount} required />
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              />
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="h-11 w-full rounded-lg bg-sky font-bold text-white disabled:bg-sky-muted"
        >
          {building ? 'Freya is drafting…' : leaveToFreya ? 'Let Freya create bill' : 'Create bill'}
        </button>
      </form>
    </Modal>
  )
}

function NewExpenseModal({ onClose }: { onClose: () => void }) {
  const money = useMoney()
  const [prompt, setPrompt] = useState('')
  const [leaveToFreya, setLeaveToFreya] = useState(false)
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Other')
  const [date, setDate] = useState('2026-07-16')
  const [accountId, setAccountId] = useState(money.accounts[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [applying, setApplying] = useState(false)
  const [building, setBuilding] = useState(false)

  function applySemiAuto() {
    if (!prompt.trim()) return
    setApplying(true)
    window.setTimeout(() => {
      const filled = freyaFillExpense(prompt)
      setMerchant(filled.merchant)
      setAmount(filled.amount)
      setCategory(filled.category)
      if (filled.notes) setNotes(filled.notes)
      setApplying(false)
    }, 550)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!accountId) return

    const filled = leaveToFreya ? freyaFillExpense(prompt) : null
    const merch = (filled?.merchant || merchant).trim()
    const amt = Number(filled?.amount || amount)
    if (!merch || !amt) return

    setBuilding(true)
    window.setTimeout(() => {
      money.createExpense({
        merchant: merch,
        amount: amt,
        category: filled?.category ?? category,
        date,
        accountId,
        notes: (filled?.notes || notes).trim() || undefined,
      })
      setBuilding(false)
      onClose()
    }, leaveToFreya ? 500 : 0)
  }

  const canSubmit = leaveToFreya || (merchant.trim().length > 0 && Number(amount) > 0)
  const busy = applying || building

  return (
    <Modal title="New expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <FreyaCreationAssist
          prompt={prompt}
          onPromptChange={setPrompt}
          leaveToFreya={leaveToFreya}
          onLeaveToFreyaChange={setLeaveToFreya}
          onApplyPrompt={applySemiAuto}
          applying={applying}
          disabled={busy}
          applyLabel="Freya, log expense from prompt"
          placeholder="e.g. New Market supply run for thread and buttons — ৳2,800"
        />
        {leaveToFreya ? (
          <p className="rounded-lg bg-sky-soft/50 px-3 py-2.5 text-[12px] text-muted">
            Full auto — Freya logs merchant, amount, and category from your prompt.
          </p>
        ) : (
          <>
            <FieldInput label="Merchant" value={merchant} onChange={setMerchant} required />
            <FieldInput label="Amount (৳)" value={amount} onChange={setAmount} required />
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              >
                {money.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-sky"
              />
            </div>
            <FieldInput label="Notes" value={notes} onChange={setNotes} />
          </>
        )}
        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="h-11 w-full rounded-lg bg-sky font-bold text-white disabled:bg-sky-muted"
        >
          {building ? 'Freya is logging…' : leaveToFreya ? 'Let Freya add expense' : 'Add expense'}
        </button>
      </form>
    </Modal>
  )
}

/* ——— Bank ——— */

function BankTab() {
  const money = useMoney()
  const [accountId, setAccountId] = useState<string | 'all'>('all')
  const [filter, setFilter] = useState<BankFilter>('all')

  const filtered = useMemo(() => {
    return money.transactions.filter((t) => {
      if (accountId !== 'all' && t.accountId !== accountId) return false
      if (filter !== 'all' && t.status !== filter) return false
      return true
    })
  }, [money.transactions, accountId, filter])

  const accountName = (id: string) => money.accounts.find((a) => a.id === id)?.name || id

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pt-4 pb-4">
      <div className="mb-3 flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAccountId('all')}
          className={`rounded-xl border px-3 py-2 text-left ${
            accountId === 'all'
              ? 'border-sky bg-sky-soft'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-semibold text-muted">All accounts</div>
          <div className="text-[14px] font-bold text-ink">{formatMoney(money.cashPosition)}</div>
        </button>
        {money.accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAccountId(a.id)}
            className={`rounded-xl border px-3 py-2 text-left ${
              accountId === a.id
                ? 'border-sky bg-sky-soft'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
              {a.name}
            </div>
            <div
              className={`text-[14px] font-bold ${a.balance < 0 ? 'text-rose-600' : 'text-ink'}`}
            >
              {formatMoneyExact(a.balance)}
            </div>
          </button>
        ))}
      </div>

      {money.unmatchedCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky/30 bg-sky-soft/60 px-4 py-3">
          <div>
            <div className="text-[13px] font-bold text-ink">
              {money.unmatchedCount} transactions still need a match
            </div>
            <div className="text-[12px] text-muted">
              Freya can pair the obvious ones so your books stay clean.
            </div>
          </div>
          <button
            type="button"
            onClick={() => money.freyaAutoMatch()}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy-mid px-3 py-2 text-[12px] font-bold text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Freya auto-match
          </button>
        </div>
      )}

      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'All' },
            { id: 'unmatched', label: 'Unmatched' },
            { id: 'matched', label: 'Matched' },
            { id: 'reconciled', label: 'Reconciled' },
          ]}
        />
        <span className="ml-auto text-[12px] text-muted">{filtered.length} transactions</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Account</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Match</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-muted">{formatShortDate(t.date)}</td>
                <td className="px-4 py-2.5 font-medium text-ink">{t.description}</td>
                <td className="px-4 py-2.5 text-muted">{accountName(t.accountId)}</td>
                <td
                  className={`px-4 py-2.5 text-right font-bold ${
                    t.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {t.direction === 'in' ? '+' : '−'}
                  {formatMoneyExact(t.amount)}
                </td>
                <td className="px-4 py-2.5">
                  <Pill tone={statusTone("txn", t.status)}>{t.status === "unmatched" ? "Unmatched" : t.status === "matched" ? "Matched" : t.status === "reconciled" ? "Reconciled" : "Excluded"}</Pill>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-muted">
                  {t.matchedTo?.label || '—'}
                  {t.freyaMatchConfidence != null && t.status === 'unmatched' && (
                    <span className="ml-1 text-sky-bright">{t.freyaMatchConfidence}%</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {t.status === 'unmatched' && (
                      <ActionBtn onClick={() => money.matchTransaction(t.id)}>Match</ActionBtn>
                    )}
                    {(t.status === 'matched' || t.status === 'unmatched') && (
                      <ActionBtn onClick={() => money.reconcileTransaction(t.id)}>
                        Reconcile
                      </ActionBtn>
                    )}
                    {t.status !== 'excluded' && t.status !== 'reconciled' && (
                      <ActionBtn onClick={() => money.excludeTransaction(t.id)}>Exclude</ActionBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted">
                  No transactions for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ——— Contacts ——— */

function ContactsTab() {
  const money = useMoney()
  const [kind, setKind] = useState<ContactKind>('customer')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    return money.parties.filter((p) => {
      if (p.kind !== kind) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!`${p.name} ${p.email} ${p.company || ''} ${p.tags.join(' ')}`.toLowerCase().includes(q))
          return false
      }
      return true
    })
  }, [money.parties, kind, query])

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pt-4 pb-4">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          {(
            [
              { id: 'customer', label: 'Customers' },
              { id: 'vendor', label: 'Vendors' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setKind(s.id)}
              className={`rounded px-3 py-1.5 text-[12px] font-bold ${
                kind === s.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, tags…"
            className="h-8 w-56 rounded-md border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-sky"
          />
        </label>
        <span className="ml-auto text-[12px] text-muted">{list.length} contacts</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <ContactCard key={p.id} party={p} />
          ))}
          {!list.length && (
            <p className="col-span-full py-12 text-center text-[13px] text-muted">
              No {kind === 'customer' ? 'customers' : 'vendors'} match.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ContactCard({ party }: { party: MoneyParty }) {
  const owesYou = party.balance > 0
  const youOwe = party.balance < 0

  return (
    <div className="overflow-hidden rounded-2xl border border-sky/15 bg-gradient-to-br from-white via-sky-soft/20 to-emerald-50/40 p-4 shadow-sm shadow-sky/10 transition hover:border-sky/25 hover:shadow-md">
      <div className="mb-3 flex items-start gap-3">
        <Avatar letter={party.name[0]} size={40} color={party.color} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-ink">{party.name}</div>
          {party.company && (
            <div className="flex items-center gap-1 truncate text-[12px] text-muted">
              <Building2 className="h-3 w-3" />
              {party.company}
            </div>
          )}
          <div className="truncate text-[12px] text-muted">{party.email}</div>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2">
        <div className="text-[11px] font-semibold text-muted uppercase">Balance</div>
        <div
          className={`text-[18px] font-bold ${
            owesYou ? 'text-emerald-600' : youOwe ? 'text-rose-600' : 'text-ink'
          }`}
        >
          {formatMoneyExact(Math.abs(party.balance))}
        </div>
        <div className="text-[11px] text-muted">
          {owesYou
            ? 'They owe you'
            : youOwe
              ? 'You owe them'
              : 'Settled up'}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {party.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-sky-soft px-1.5 py-0.5 text-[10px] font-bold text-sky-bright"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="text-[11px] text-muted">Last activity · {party.lastActivity}</div>
    </div>
  )
}

/* ——— Reports ——— */

function ReportsTab() {
  const money = useMoney()

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const ex of money.expenses) {
      if (ex.status === 'rejected') continue
      map.set(ex.category, (map.get(ex.category) || 0) + ex.amount)
    }
    for (const bill of money.bills) {
      if (bill.status === 'draft') continue
      map.set(bill.category, (map.get(bill.category) || 0) + docTotal(bill.items))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [money.expenses, money.bills])

  const agedRecv = useMemo(() => {
    const buckets = { current: 0, '1-30': 0, '31-60': 0, '60+': 0 }
    for (const inv of money.invoices) {
      if (['paid', 'void', 'draft'].includes(inv.status)) continue
      const bal = invoiceBalance(inv)
      if (bal <= 0) continue
      buckets[agingBucket(inv.dueDate, inv.status)] += bal
    }
    return buckets
  }, [money.invoices])

  const agedPay = useMemo(() => {
    const buckets = { current: 0, '1-30': 0, '31-60': 0, '60+': 0 }
    for (const bill of money.bills) {
      if (['paid', 'draft'].includes(bill.status)) continue
      const bal = billBalance(bill)
      if (bal <= 0) continue
      buckets[agingBucket(bill.dueDate, bill.status)] += bal
    }
    return buckets
  }, [money.bills])

  const watchlist = money.ledger.filter((l) => l.watchlist)
  const maxCat = Math.max(...expenseBreakdown.map(([, v]) => v), 1)

  return (
    <div className="h-full overflow-y-auto px-6 py-5 pb-20">
      <div className="mb-5 overflow-hidden rounded-2xl border border-sky/40 bg-gradient-to-br from-sky-soft/50 via-white to-sky-soft/40 p-5 shadow-sm shadow-sky/15">
        <h3 className="mb-1 text-[15px] font-bold text-ink">Profit & loss — July</h3>
        <p className="mb-4 text-[13px] text-muted">
          Simple snapshot of money in, money out, and what&apos;s left.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-mint px-4 py-3 text-white shadow-sm shadow-emerald-300/30">
            <div className="text-[11px] font-semibold text-white/80 uppercase">Income</div>
            <div className="text-[22px] font-bold">{formatMoney(money.monthIncome)}</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-rose-500 to-coral px-4 py-3 text-white shadow-sm shadow-rose-300/30">
            <div className="text-[11px] font-semibold text-white/80 uppercase">Expenses</div>
            <div className="text-[22px] font-bold">{formatMoney(money.monthExpenses)}</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-sky-bright to-sky-bright px-4 py-3 text-white shadow-sm shadow-sky/30">
            <div className="text-[11px] font-semibold text-white/80 uppercase">Net</div>
            <div className="text-[22px] font-bold">{formatMoney(money.netProfit)}</div>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="mb-3 text-[13px] font-bold text-ink">Spending by category</h4>
          <div className="space-y-2">
            {expenseBreakdown.slice(0, 8).map(([cat, amt]) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="font-semibold text-ink">{cat}</span>
                  <span className="text-muted">{formatMoney(amt)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-bright via-sky to-rose-400"
                    style={{ width: `${Math.max(4, Math.round((amt / maxCat) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-sky/15 bg-gradient-to-br from-sky-soft/50 via-white to-rose-50/40 p-5 shadow-sm shadow-sky/10">
        <h3 className="mb-3 text-[15px] font-bold text-ink">Cash flow</h3>
        <CashflowChart cashflow={money.cashflow} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <AgingSummary
          title="Aged receivables"
          subtitle="Customers who still owe you"
          buckets={agedRecv}
        />
        <AgingSummary
          title="Aged payables"
          subtitle="Bills you still need to pay"
          buckets={agedPay}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky/15 bg-gradient-to-br from-white via-sky-soft/20 to-sky-soft/30 p-5 shadow-sm shadow-sky/10">
        <h3 className="mb-1 text-[15px] font-bold text-ink">Chart of accounts watchlist</h3>
        <p className="mb-4 text-[13px] text-muted">
          Key accounts Freya watches — budget vs actual where set.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">Budget / mo</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((la) => {
                const over =
                  la.budgetMonthly != null &&
                  la.type === 'expense' &&
                  Math.abs(la.balance) > la.budgetMonthly
                return (
                  <tr key={la.id} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-muted">{la.code}</td>
                    <td className="px-3 py-2.5 font-semibold text-ink">{la.name}</td>
                    <td className="px-3 py-2.5 capitalize text-muted">{la.type}</td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold ${
                        over ? 'text-rose-600' : 'text-ink'
                      }`}
                    >
                      {formatMoney(la.balance)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted">
                      {la.budgetMonthly != null ? formatMoney(la.budgetMonthly) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AgingSummary({
  title,
  subtitle,
  buckets,
}: {
  title: string
  subtitle: string
  buckets: Record<'current' | '1-30' | '31-60' | '60+', number>
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      <p className="mb-3 text-[12px] text-muted">{subtitle}</p>
      <div className="space-y-2">
        {(
          [
            ['current', 'Current'],
            ['1-30', '1–30 days'],
            ['31-60', '31–60 days'],
            ['60+', '60+ days'],
          ] as const
        ).map(([key, label]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
          >
            <span className="text-[13px] font-medium text-ink">{label}</span>
            <span className="text-[13px] font-bold text-ink">{formatMoney(buckets[key])}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ——— Freya ——— */

function FreyaTab({
  onGoInvoices,
  onGoBills,
  onGoBank,
  onGoReports,
}: {
  onGoInvoices: () => void
  onGoBills: () => void
  onGoBank: () => void
  onGoReports: () => void
}) {
  const money = useMoney()
  const [toast, setToast] = useState<string | null>(null)

  const draftedInvoices = money.invoices.filter((i) => i.freyaDrafted)
  const flaggedBills = money.bills.filter((b) => b.freyaFlagged)
  const draftCustomer = money.parties.find((p) => p.kind === 'customer' && p.balance > 0)

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  function draftForCustomer() {
    if (!draftCustomer) {
      flash('No customer with a balance right now.')
      return
    }
    money.createInvoice({
      customerId: draftCustomer.id,
      customerName: draftCustomer.name,
      description: `Follow-up balance for ${draftCustomer.name}`,
      amount: Math.max(24, Math.round(draftCustomer.balance)),
      dueDate: '2026-07-30',
    })
    onGoInvoices()
    flash(`Drafted invoice for ${draftCustomer.name}`)
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5 pb-20">
      {toast && (
        <div className="mb-4 rounded-xl border border-sky/30 bg-sky-soft px-4 py-2.5 text-[13px] font-semibold text-sky-bright">
          {toast}
        </div>
      )}

      <div className="relative mb-5 overflow-hidden rounded-2xl border border-sky/25 bg-gradient-to-br from-navy-deep via-navy-mid to-sky-bright/80 p-5 text-white shadow-md shadow-navy/30">
        <div className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full bg-sunshine/20 blur-3xl" />
        <div className="relative mb-2 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-bright to-sky-bright shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <h3 className="text-[18px] font-bold">How Freya helps with Money</h3>
        </div>
        <p className="relative max-w-2xl text-[14px] leading-relaxed text-slate-300">
          Freya drafts invoices from deals and signups, chases overdue customers in plain language,
          matches bank transactions to bills and expenses, and suggests categories when receipts look
          messy. You stay in charge — she just clears the busywork so cash stays visible.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Chase overdue"
          body="Send reminders on invoices past due."
          icon={AlertTriangle}
          onClick={() => {
            const n = money.chaseOverdue()
            flash(`Freya chased ${n} overdue invoice${n === 1 ? '' : 's'}`)
            onGoInvoices()
          }}
        />
        <ActionCard
          title="Auto-match bank"
          body="Pair high-confidence bank lines."
          icon={Landmark}
          onClick={() => {
            const n = money.freyaAutoMatch()
            flash(`Matched ${n} transaction${n === 1 ? '' : 's'}`)
            onGoBank()
          }}
        />
        <ActionCard
          title="Approve expense categories"
          body="Accept Freya’s category suggestions."
          icon={Receipt}
          onClick={() => {
            const n = money.freyaCategorizeExpenses()
            flash(`Approved ${n} expense${n === 1 ? '' : 's'}`)
            onGoBills()
          }}
        />
        <ActionCard
          title="Draft invoice"
          body={
            draftCustomer
              ? `For ${draftCustomer.name} (${formatMoney(draftCustomer.balance)})`
              : 'No open customer balances'
          }
          icon={FileText}
          onClick={draftForCustomer}
        />
      </div>

      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-ink">Insights</h3>
          <button
            type="button"
            onClick={onGoReports}
            className="text-[12px] font-semibold text-sky"
          >
            Jump to reports →
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {money.insights.map((insight) => (
            <MoneyInsightCard
              key={insight.id}
              insight={insight}
              onDismiss={() => money.dismissInsight(insight.id)}
              onAction={() => {
                switch (insight.actionKind) {
                  case 'chase':
                    money.chaseOverdue()
                    onGoInvoices()
                    break
                  case 'reconcile':
                    onGoBank()
                    break
                  case 'pay-bills':
                  case 'categorize':
                    onGoBills()
                    break
                  case 'invoice':
                    onGoInvoices()
                    break
                  default:
                    onGoReports()
                }
              }}
            />
          ))}
          {!money.insights.length && (
            <p className="col-span-full rounded-xl border border-dashed border-slate-200 py-10 text-center text-[13px] text-muted">
              No open insights — Freya is caught up.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[15px] font-bold text-ink">Freya-drafted invoices</h3>
          <div className="space-y-2">
            {draftedInvoices.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => {
                  money.selectInvoice(inv.id)
                  onGoInvoices()
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-left hover:bg-sky-soft/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">
                    {inv.number} · {inv.customerName}
                  </div>
                  <div className="text-[11px] text-muted">
                    {invoiceStatusMeta(inv.status).label} · due {formatShortDate(inv.dueDate)}
                  </div>
                </div>
                <div className="shrink-0 text-[13px] font-bold text-ink">
                  {formatMoney(invoiceBalance(inv) || docTotal(inv.items))}
                </div>
              </button>
            ))}
            {!draftedInvoices.length && (
              <p className="py-6 text-center text-[13px] text-muted">No Freya drafts yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[15px] font-bold text-ink">Flagged bills</h3>
          <div className="space-y-2">
            {flaggedBills.map((bill) => (
              <button
                key={bill.id}
                type="button"
                onClick={() => {
                  money.selectBill(bill.id)
                  onGoBills()
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-left hover:bg-amber-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">
                    {bill.number} · {bill.vendorName}
                  </div>
                  <div className="text-[11px] text-muted">
                    {billStatusMeta(bill.status).label} · {bill.category}
                  </div>
                </div>
                <div className="shrink-0 text-[13px] font-bold text-ink">
                  {formatMoney(billBalance(bill) || docTotal(bill.items))}
                </div>
              </button>
            ))}
            {!flaggedBills.length && (
              <p className="py-6 text-center text-[13px] text-muted">No flagged bills.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ——— Shared UI ——— */

function CashflowChart({ cashflow }: { cashflow: CashMonth[] }) {
  const max = Math.max(...cashflow.flatMap((m) => [m.cashIn, m.cashOut]), 1)
  return (
    <div className="flex h-44 items-end gap-3">
      {cashflow.map((m) => (
        <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex h-36 w-full items-end justify-center gap-1">
            <div
              className="w-[42%] rounded-t bg-emerald-500/80"
              style={{ height: `${Math.max(6, Math.round((m.cashIn / max) * 100))}%` }}
              title={`In ${formatMoney(m.cashIn)}`}
            />
            <div
              className="w-[42%] rounded-t bg-rose-400/80"
              style={{ height: `${Math.max(6, Math.round((m.cashOut / max) * 100))}%` }}
              title={`Out ${formatMoney(m.cashOut)}`}
            />
          </div>
          <span className="text-[11px] font-semibold text-muted">{m.month}</span>
        </div>
      ))}
    </div>
  )
}


function TaskChip({
  label,
  tone,
  onClick,
}: {
  label: string
  tone: 'rose' | 'sky' | 'amber'
  onClick: () => void
}) {
  const tones = {
    rose: 'bg-gradient-to-r from-rose-500 to-coral text-white shadow-sm shadow-rose-300/40 border-transparent',
    sky: 'bg-gradient-to-r from-sky-bright to-sky text-white shadow-sm shadow-sky/30 border-transparent',
    amber: 'bg-gradient-to-r from-amber-500 to-sunshine text-navy-deep shadow-sm shadow-amber-300/40 border-transparent',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition hover:brightness-105 ${tones[tone]}`}
    >
      {label}
    </button>
  )
}




function ActionBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-sky hover:text-sky"
    >
      {children}
    </button>
  )
}


function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2">
      <div className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</div>
      <div className="text-[13px] font-semibold text-ink">{value}</div>
    </div>
  )
}

function ActionCard({
  title,
  body,
  icon: Icon,
  onClick,
}: {
  title: string
  body: string
  icon: typeof Sparkles
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-sky/15 bg-gradient-to-br from-white via-sky-soft/25 to-sky-soft/30 p-4 text-left shadow-sm shadow-sky/10 transition hover:-translate-y-0.5 hover:border-sky/30 hover:shadow-md hover:shadow-sky/20"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-bright to-sky-bright text-white shadow-sm transition group-hover:scale-105">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[14px] font-bold text-ink">{title}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">{body}</p>
    </button>
  )
}

function MoneyInsightCard({
  insight,
  onDismiss,
  onAction,
}: {
  insight: MoneyInsight
  onDismiss: () => void
  onAction: () => void
}) {
  const tone =
    insight.tone === 'risk'
      ? 'border-rose-200/60 bg-gradient-to-br from-rose-50 via-white to-peach/30 shadow-sm shadow-rose-200/20'
      : insight.tone === 'win'
        ? 'border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-mint/30 shadow-sm shadow-emerald-200/20'
        : insight.tone === 'action'
          ? 'border-sky/30 bg-gradient-to-br from-sky-soft/70 via-white to-sky-soft/40 shadow-sm shadow-sky/15'
          : 'border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-sky-soft/30'
  const iconTone =
    insight.tone === 'risk'
      ? 'bg-gradient-to-br from-rose-500 to-coral text-white'
      : insight.tone === 'win'
        ? 'bg-gradient-to-br from-emerald-500 to-mint text-white'
        : insight.tone === 'action'
          ? 'bg-gradient-to-br from-sky-bright to-sky-bright text-white'
          : 'bg-gradient-to-br from-slate-400 to-slate-600 text-white'
  const Icon =
    insight.tone === 'risk'
      ? AlertTriangle
      : insight.tone === 'win'
        ? CheckCircle2
        : insight.tone === 'action'
          ? Sparkles
          : TrendingDown

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="mb-2 flex items-start gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink">{insight.title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{insight.body}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {insight.actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full bg-gradient-to-r from-navy-mid to-sky-bright px-3 py-1.5 text-[11px] font-bold text-white shadow-sm"
          >
            {insight.actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-500"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}


