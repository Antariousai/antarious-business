import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'money')

    const resource = new URL(req.url).searchParams.get('resource') || 'summary'

    if (resource === 'invoices') {
      const { data, error } = await supabase
        .from('money_invoices')
        .select('*, money_invoice_lines(*)')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ invoices: data ?? [] })
    }

    if (resource === 'bills') {
      const { data, error } = await supabase
        .from('money_bills')
        .select('*, money_bill_lines(*)')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ bills: data ?? [] })
    }

    if (resource === 'expenses') {
      const { data, error } = await supabase
        .from('money_expenses')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('spent_at', { ascending: false })
      if (error) throw error
      return Response.json({ expenses: data ?? [] })
    }

    if (resource === 'accounts') {
      const { data, error } = await supabase
        .from('money_accounts')
        .select('*')
        .eq('organization_id', ctx.organizationId)
      if (error) throw error
      return Response.json({ accounts: data ?? [] })
    }

    if (resource === 'parties') {
      const { data, error } = await supabase
        .from('money_parties')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ parties: data ?? [] })
    }

    if (resource === 'transactions') {
      const { data, error } = await supabase
        .from('money_transactions')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('txn_date', { ascending: false })
      if (error) throw error
      return Response.json({ transactions: data ?? [] })
    }

    if (resource === 'ledger') {
      const { data, error } = await supabase
        .from('money_ledger_accounts')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('code', { ascending: true })
      if (error) throw error
      return Response.json({ ledger: data ?? [] })
    }

    if (resource === 'cashflow') {
      const { data, error } = await supabase
        .from('money_cashflow_snapshots')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('month', { ascending: true })
      if (error) throw error
      return Response.json({ cashflow: data ?? [] })
    }

    if (resource === 'all') {
      const [invoices, bills, expenses, accounts, parties, transactions, ledger, cashflow] =
        await Promise.all([
        supabase
          .from('money_invoices')
          .select('*, money_invoice_lines(*)')
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('money_bills')
          .select('*, money_bill_lines(*)')
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('money_expenses')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('spent_at', { ascending: false }),
        supabase
          .from('money_accounts')
          .select('*')
          .eq('organization_id', ctx.organizationId),
        supabase
          .from('money_parties')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('money_transactions')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('txn_date', { ascending: false }),
        supabase
          .from('money_ledger_accounts')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('code', { ascending: true }),
        supabase
          .from('money_cashflow_snapshots')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('month', { ascending: true }),
      ])
      for (const r of [
        invoices,
        bills,
        expenses,
        accounts,
        parties,
        transactions,
        ledger,
        cashflow,
      ]) {
        if (r.error) throw r.error
      }
      return Response.json({
        invoices: invoices.data ?? [],
        bills: bills.data ?? [],
        expenses: expenses.data ?? [],
        accounts: accounts.data ?? [],
        parties: parties.data ?? [],
        transactions: transactions.data ?? [],
        ledger: ledger.data ?? [],
        cashflow: cashflow.data ?? [],
      })
    }

    const [invoices, expenses, accounts] = await Promise.all([
      supabase
        .from('money_invoices')
        .select('status, total_bdt')
        .eq('organization_id', ctx.organizationId),
      supabase
        .from('money_expenses')
        .select('amount_bdt')
        .eq('organization_id', ctx.organizationId),
      supabase
        .from('money_accounts')
        .select('balance_bdt')
        .eq('organization_id', ctx.organizationId),
    ])

    const openReceivables = (invoices.data ?? [])
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((s, i) => s + Number(i.total_bdt || 0), 0)
    const spent = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount_bdt || 0), 0)
    const cash = (accounts.data ?? []).reduce((s, a) => s + Number(a.balance_bdt || 0), 0)

    return Response.json({
      summary: { openReceivables, spent, cash, currency: 'BDT' },
    })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'money')

    const body = await req.json()
    const resource = body.resource || 'invoices'

    if (resource === 'expenses') {
      const { data, error } = await supabase
        .from('money_expenses')
        .insert({
          organization_id: ctx.organizationId,
          description: String(body.description ?? 'Expense'),
          amount_bdt: body.amountBdt ?? 0,
          category: body.category ?? null,
          payment_method: body.paymentMethod ?? 'cash',
          spent_at: body.spentAt ?? new Date().toISOString().slice(0, 10),
        })
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ expense: data }, { status: 201 })
    }

    if (resource === 'bills') {
      const { data: bill, error } = await supabase
        .from('money_bills')
        .insert({
          organization_id: ctx.organizationId,
          number: body.number ?? `BILL-${Date.now().toString().slice(-6)}`,
          status: body.status ?? 'open',
          total_bdt: body.totalBdt ?? 0,
          due_at: body.dueAt ?? null,
          party_id: body.partyId ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      if (Array.isArray(body.lines) && bill) {
        await supabase.from('money_bill_lines').insert(
          body.lines.map((line: { description: string; qty?: number; unitBdt?: number }) => ({
            bill_id: bill.id,
            description: line.description,
            qty: line.qty ?? 1,
            unit_bdt: line.unitBdt ?? 0,
          })),
        )
      }
      return Response.json({ bill }, { status: 201 })
    }

    if (resource === 'accounts') {
      const { data, error } = await supabase
        .from('money_accounts')
        .insert({
          organization_id: ctx.organizationId,
          name: String(body.name ?? 'Cash'),
          kind: body.kind ?? 'cash',
          balance_bdt: body.balanceBdt ?? 0,
        })
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ account: data }, { status: 201 })
    }

    if (resource === 'transactions') {
      const { data, error } = await supabase
        .from('money_transactions')
        .insert({
          organization_id: ctx.organizationId,
          account_id: body.accountId ?? null,
          amount_bdt: body.amountBdt ?? 0,
          direction: body.direction === 'out' ? 'out' : 'in',
          memo: body.memo ?? body.description ?? null,
          txn_date: body.txnDate ?? new Date().toISOString().slice(0, 10),
          status: body.status ?? 'unmatched',
          category: body.category ?? null,
          invoice_id: body.invoiceId ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ transaction: data }, { status: 201 })
    }

    if (resource === 'ledger') {
      const { data, error } = await supabase
        .from('money_ledger_accounts')
        .insert({
          organization_id: ctx.organizationId,
          code: String(body.code ?? '0000'),
          name: String(body.name ?? 'Account'),
          type: body.type ?? 'expense',
          balance_bdt: body.balanceBdt ?? 0,
          budget_monthly_bdt: body.budgetMonthlyBdt ?? null,
          watchlist: Boolean(body.watchlist),
        })
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ ledgerAccount: data }, { status: 201 })
    }

    if (resource === 'cashflow') {
      const { data, error } = await supabase
        .from('money_cashflow_snapshots')
        .upsert(
          {
            organization_id: ctx.organizationId,
            month: String(body.month ?? new Date().toISOString().slice(0, 7)),
            cash_in_bdt: body.cashInBdt ?? 0,
            cash_out_bdt: body.cashOutBdt ?? 0,
          },
          { onConflict: 'organization_id,month' },
        )
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ cashflow: data }, { status: 201 })
    }

    const { data: invoice, error } = await supabase
      .from('money_invoices')
      .insert({
        organization_id: ctx.organizationId,
        number: body.number ?? `INV-${Date.now().toString().slice(-6)}`,
        status: body.status ?? 'draft',
        total_bdt: body.totalBdt ?? 0,
        due_at: body.dueAt ?? null,
        notes: body.notes ?? null,
        party_id: body.partyId ?? null,
      })
      .select('*')
      .single()
    if (error) throw error

    if (Array.isArray(body.lines) && invoice) {
      await supabase.from('money_invoice_lines').insert(
        body.lines.map((line: { description: string; qty?: number; unitBdt?: number }) => ({
          invoice_id: invoice.id,
          description: line.description,
          qty: line.qty ?? 1,
          unit_bdt: line.unitBdt ?? 0,
        })),
      )
    }

    return Response.json({ invoice }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'money')

    const body = await req.json()
    const resource = body.resource || 'invoices'

    // Bulk auto-match: match every unmatched transaction to an expense/invoice
    // by amount (deterministic). No id required.
    if (resource === 'transactions' && body.autoMatch) {
      const [{ data: txns }, { data: expenses }] = await Promise.all([
        supabase
          .from('money_transactions')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .eq('status', 'unmatched'),
        supabase
          .from('money_expenses')
          .select('id, description, amount_bdt, category')
          .eq('organization_id', ctx.organizationId),
      ])
      let matched = 0
      for (const t of txns ?? []) {
        const amount = Number(t.amount_bdt ?? 0)
        const hit = (expenses ?? []).find((e) => Math.abs(Number(e.amount_bdt ?? 0) - amount) < 1)
        const { error } = await supabase
          .from('money_transactions')
          .update({
            status: 'matched',
            category: hit?.category ?? (t.direction === 'in' ? 'Sales' : 'Other'),
            matched_type: 'expense',
            matched_ref: hit?.id ?? 'auto',
            matched_label: hit?.description ?? (t.direction === 'in' ? 'Sales (Freya)' : 'Expense (Freya)'),
            freya_match_confidence: hit ? 92 : 75,
          })
          .eq('id', t.id)
          .eq('organization_id', ctx.organizationId)
        if (!error) matched += 1
      }
      return Response.json({ ok: true, matched })
    }

    const id = String(body.id ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    if (resource === 'transactions') {
      const patch: Record<string, unknown> = {}
      if (body.status != null) patch.status = body.status
      if (body.category != null) patch.category = body.category
      if (body.matchedType != null) patch.matched_type = body.matchedType
      if (body.matchedRef != null) patch.matched_ref = body.matchedRef
      if (body.matchedLabel != null) patch.matched_label = body.matchedLabel
      if (body.freyaMatchConfidence != null)
        patch.freya_match_confidence = body.freyaMatchConfidence
      const { data, error } = await supabase
        .from('money_transactions')
        .update(patch)
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ transaction: data })
    }

    if (resource === 'ledger') {
      const patch: Record<string, unknown> = {}
      if (body.name != null) patch.name = body.name
      if (body.balanceBdt != null) patch.balance_bdt = body.balanceBdt
      if (body.budgetMonthlyBdt != null) patch.budget_monthly_bdt = body.budgetMonthlyBdt
      if (body.watchlist != null) patch.watchlist = body.watchlist
      const { data, error } = await supabase
        .from('money_ledger_accounts')
        .update(patch)
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ ledgerAccount: data })
    }

    if (body.markPaid) {
      const table = resource === 'bills' ? 'money_bills' : 'money_invoices'
      const { data, error } = await supabase
        .from(table)
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: body.paymentMethod ?? 'bkash',
        })
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json(resource === 'bills' ? { bill: data } : { invoice: data })
    }

    if (resource === 'bills') {
      const { data, error } = await supabase
        .from('money_bills')
        .update({
          status: body.status ?? undefined,
          total_bdt: body.totalBdt ?? undefined,
        })
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ bill: data })
    }

    const { data, error } = await supabase
      .from('money_invoices')
      .update({
        status: body.status ?? undefined,
        notes: body.notes ?? undefined,
        total_bdt: body.totalBdt ?? undefined,
      })
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return Response.json({ invoice: data })
  } catch (err) {
    return jsonError(err)
  }
}
