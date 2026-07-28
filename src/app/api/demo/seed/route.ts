import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'

export const runtime = 'nodejs'

/** Seed BD boutique demo data for the caller's org. */
export async function POST() {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const org = ctx.organizationId
    const { count: acctCount } = await supabase
      .from('money_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org)

    if (!acctCount) {
      await supabase.from('money_accounts').insert([
        { organization_id: org, name: 'Cash', kind: 'cash', balance_bdt: 12500 },
        { organization_id: org, name: 'bKash', kind: 'bkash', balance_bdt: 8200 },
        { organization_id: org, name: 'Nagad', kind: 'nagad', balance_bdt: 3100 },
        { organization_id: org, name: 'DBBL', kind: 'bank', balance_bdt: 45000 },
      ])
    }

    // Ledger chart of accounts (seed once)
    const { count: ledgerCount } = await supabase
      .from('money_ledger_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org)
    if (!ledgerCount) {
      await supabase.from('money_ledger_accounts').insert([
        { organization_id: org, code: '4000', name: 'Sales', type: 'income', balance_bdt: 128000, watchlist: false },
        { organization_id: org, code: '5000', name: 'Inventory', type: 'expense', balance_bdt: 42000, budget_monthly_bdt: 50000, watchlist: true },
        { organization_id: org, code: '5100', name: 'Marketing', type: 'expense', balance_bdt: 9500, budget_monthly_bdt: 12000, watchlist: false },
        { organization_id: org, code: '5200', name: 'Rent', type: 'expense', balance_bdt: 18000, budget_monthly_bdt: 18000, watchlist: false },
      ])
    }

    // Cashflow snapshots (seed once)
    const { count: cashflowCount } = await supabase
      .from('money_cashflow_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org)
    if (!cashflowCount) {
      await supabase.from('money_cashflow_snapshots').insert([
        { organization_id: org, month: '2026-05', cash_in_bdt: 96000, cash_out_bdt: 71000 },
        { organization_id: org, month: '2026-06', cash_in_bdt: 112000, cash_out_bdt: 83000 },
        { organization_id: org, month: '2026-07', cash_in_bdt: 128000, cash_out_bdt: 90000 },
      ])
    }

    // Bank transactions to reconcile (seed once)
    const { count: txnCount } = await supabase
      .from('money_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org)
    if (!txnCount) {
      const { data: acct } = await supabase
        .from('money_accounts')
        .select('id')
        .eq('organization_id', org)
        .limit(1)
        .maybeSingle()
      await supabase.from('money_transactions').insert([
        { organization_id: org, account_id: acct?.id ?? null, amount_bdt: 12500, direction: 'in', memo: 'bKash — Lawn set order', txn_date: new Date().toISOString().slice(0, 10), status: 'unmatched' },
        { organization_id: org, account_id: acct?.id ?? null, amount_bdt: 4200, direction: 'out', memo: 'Packaging supplies', txn_date: new Date().toISOString().slice(0, 10), status: 'unmatched' },
        { organization_id: org, account_id: acct?.id ?? null, amount_bdt: 8000, direction: 'in', memo: 'Nagad — wholesale advance', txn_date: new Date().toISOString().slice(0, 10), status: 'unmatched' },
      ])
    }

    const { data: post } = await supabase
      .from('content_posts')
      .insert({
        organization_id: org,
        title: 'Eid lawn drop',
        caption:
          'New lawn collection just landed ✨ Soft pastels, festive ready. DM to reserve your size — delivery across BD.',
        status: 'scheduled',
        tag: 'Festive',
        scheduled_at: new Date(Date.now() + 3600_000).toISOString(),
        created_by: ctx.user.id,
      })
      .select('id')
      .single()

    if (post?.id) {
      await supabase.from('content_post_platforms').insert([
        { post_id: post.id, platform: 'Facebook' },
        { post_id: post.id, platform: 'Instagram' },
      ])
    }

    await supabase.from('post_templates').insert({
      organization_id: org,
      name: 'New arrival',
      caption: 'Fresh stock this week — message us to order 💛',
      platforms: ['Facebook', 'Instagram'],
      tag: 'New arrival',
    })

    const { data: thread } = await supabase
      .from('inbox_threads')
      .insert({
        organization_id: org,
        contact_name: 'Ayesha Rahman',
        platform: 'WhatsApp',
        subject: 'Size for pink lawn?',
        status: 'open',
        unread: true,
      })
      .select('id')
      .single()

    if (thread?.id) {
      await supabase.from('inbox_messages').insert([
        {
          thread_id: thread.id,
          organization_id: org,
          kind: 'customer',
          body: 'Apa, pink lawn ta L size ache? Price koto?',
          delivery_status: 'local_only',
        },
      ])
    }

    await supabase.from('leads').insert({
      organization_id: org,
      name: 'Nusrat Jahan',
      company: 'Gulshan boutique walk-in',
      phone: '01700000000',
      stage: 'contacted',
      temperature: 'hot',
      source: 'Instagram',
      notes: 'Interested in wholesale lawn for Eid.',
    })

    await supabase.from('crm_deals').insert({
      organization_id: org,
      title: 'Corporate gift order — 40 pieces',
      stage: 'proposal',
      value_bdt: 85000,
      next_step: 'Send fabric swatches + quote on WhatsApp',
    })

    await supabase.from('money_invoices').insert({
      organization_id: org,
      number: 'INV-1001',
      status: 'sent',
      total_bdt: 12500,
      due_at: new Date(Date.now() + 86400_000 * 5).toISOString().slice(0, 10),
      notes: 'Lawn set × 2',
    })

    await supabase.from('freya_activity_items').insert({
      organization_id: org,
      kind: 'info',
      title: 'Demo seed ready',
      summary: 'BD boutique sample posts, inbox, lead, deal, and invoice loaded.',
      status: 'info',
      payload: { action: 'noop' },
      created_by: ctx.user.id,
    })

    return Response.json({ ok: true, organizationId: org })
  } catch (err) {
    return jsonError(err)
  }
}
