import type { SupabaseClient } from '@supabase/supabase-js'

export type SeedOrgResult = {
  organizationId: string
  userId: string
  email: string | null
  businessName: string
  inserted: {
    moneyAccounts: boolean
    ledger: boolean
    cashflow: boolean
    transactions: boolean
    post: boolean
    template: boolean
    inbox: boolean
    lead: boolean
    deal: boolean
    invoice: boolean
    activity: boolean
  }
}

type BizSnap = {
  businessName: string
  industry: string
  customers: string
  ownerName: string
}

function snapFromRows(
  bp: {
    business_name?: string | null
    industry?: string | null
    customers?: string | null
  } | null,
  profile: { full_name?: string | null } | null,
): BizSnap {
  return {
    businessName: bp?.business_name?.trim() || 'your shop',
    industry: bp?.industry?.trim() || 'small business',
    customers: bp?.customers?.trim() || 'your customers',
    ownerName: profile?.full_name?.trim() || 'friend',
  }
}

/**
 * Insert demo / test data into an organization, personalized from their
 * business profile when available. Money chart-of-accounts style rows seed once;
 * content / inbox / CRM rows insert on each call so testers can re-run.
 */
export async function seedOrgDemo(
  supabase: SupabaseClient,
  opts: { organizationId: string; userId: string; email?: string | null },
): Promise<SeedOrgResult> {
  const org = opts.organizationId
  const userId = opts.userId

  const [{ data: bp }, { data: profile }] = await Promise.all([
    supabase
      .from('business_profiles')
      .select('business_name, industry, customers')
      .eq('organization_id', org)
      .maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
  ])

  const biz = snapFromRows(bp, profile)
  const inserted: SeedOrgResult['inserted'] = {
    moneyAccounts: false,
    ledger: false,
    cashflow: false,
    transactions: false,
    post: false,
    template: false,
    inbox: false,
    lead: false,
    deal: false,
    invoice: false,
    activity: false,
  }

  const { count: acctCount } = await supabase
    .from('money_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org)

  if (!acctCount) {
    const { error } = await supabase.from('money_accounts').insert([
      { organization_id: org, name: 'Cash', kind: 'cash', balance_bdt: 12500 },
      { organization_id: org, name: 'bKash', kind: 'bkash', balance_bdt: 8200 },
      { organization_id: org, name: 'Nagad', kind: 'nagad', balance_bdt: 3100 },
      { organization_id: org, name: 'DBBL', kind: 'bank', balance_bdt: 45000 },
    ])
    if (!error) inserted.moneyAccounts = true
  }

  const { count: ledgerCount } = await supabase
    .from('money_ledger_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org)
  if (!ledgerCount) {
    const { error } = await supabase.from('money_ledger_accounts').insert([
      {
        organization_id: org,
        code: '4000',
        name: 'Sales',
        type: 'income',
        balance_bdt: 128000,
        watchlist: false,
      },
      {
        organization_id: org,
        code: '5000',
        name: 'Inventory / COGS',
        type: 'expense',
        balance_bdt: 42000,
        budget_monthly_bdt: 50000,
        watchlist: true,
      },
      {
        organization_id: org,
        code: '5100',
        name: 'Marketing',
        type: 'expense',
        balance_bdt: 9500,
        budget_monthly_bdt: 12000,
        watchlist: false,
      },
      {
        organization_id: org,
        code: '5200',
        name: 'Rent',
        type: 'expense',
        balance_bdt: 18000,
        budget_monthly_bdt: 18000,
        watchlist: false,
      },
    ])
    if (!error) inserted.ledger = true
  }

  const { count: cashflowCount } = await supabase
    .from('money_cashflow_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org)
  if (!cashflowCount) {
    const { error } = await supabase.from('money_cashflow_snapshots').insert([
      { organization_id: org, month: '2026-05', cash_in_bdt: 96000, cash_out_bdt: 71000 },
      { organization_id: org, month: '2026-06', cash_in_bdt: 112000, cash_out_bdt: 83000 },
      { organization_id: org, month: '2026-07', cash_in_bdt: 128000, cash_out_bdt: 90000 },
    ])
    if (!error) inserted.cashflow = true
  }

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
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('money_transactions').insert([
      {
        organization_id: org,
        account_id: acct?.id ?? null,
        amount_bdt: 12500,
        direction: 'in',
        memo: `bKash — order for ${biz.customers}`,
        txn_date: today,
        status: 'unmatched',
      },
      {
        organization_id: org,
        account_id: acct?.id ?? null,
        amount_bdt: 4200,
        direction: 'out',
        memo: `${biz.industry} supplies`,
        txn_date: today,
        status: 'unmatched',
      },
      {
        organization_id: org,
        account_id: acct?.id ?? null,
        amount_bdt: 8000,
        direction: 'in',
        memo: 'Nagad — advance payment',
        txn_date: today,
        status: 'unmatched',
      },
    ])
    if (!error) inserted.transactions = true
  }

  const postCaption = `Something new from ${biz.businessName}. Made with ${biz.customers} in mind — message us to reserve yours. Delivery across BD.`
  const { data: post, error: postError } = await supabase
    .from('content_posts')
    .insert({
      organization_id: org,
      title: `${biz.businessName} weekly drop`,
      caption: postCaption,
      status: 'draft',
      tag: 'Update',
      scheduled_at: new Date(Date.now() + 3600_000).toISOString(),
      created_by: userId,
    })
    .select('id')
    .single()

  if (!postError && post?.id) {
    await supabase.from('content_post_platforms').insert([
      { post_id: post.id, platform: 'Facebook' },
      { post_id: post.id, platform: 'Instagram' },
    ])
    inserted.post = true
  }

  const { error: tplError } = await supabase.from('post_templates').insert({
    organization_id: org,
    name: 'New arrival',
    caption: `Fresh from ${biz.businessName} this week — message us to order.`,
    platforms: ['Facebook', 'Instagram'],
    tag: 'New arrival',
  })
  if (!tplError) inserted.template = true

  const { data: thread, error: threadError } = await supabase
    .from('inbox_threads')
    .insert({
      organization_id: org,
      contact_name: 'Ayesha Rahman',
      platform: 'WhatsApp',
      subject: `Question for ${biz.businessName}`,
      status: 'open',
      unread: true,
    })
    .select('id')
    .single()

  if (!threadError && thread?.id) {
    await supabase.from('inbox_messages').insert([
      {
        thread_id: thread.id,
        organization_id: org,
        kind: 'customer',
        body: `Hi ${biz.ownerName}, do you have this in stock for ${biz.customers}? Price please?`,
        delivery_status: 'local_only',
      },
    ])
    inserted.inbox = true
  }

  const { error: leadError } = await supabase.from('leads').insert({
    organization_id: org,
    name: 'Nusrat Jahan',
    company: `${biz.industry} inquiry`,
    phone: '01700000000',
    stage: 'contacted',
    temperature: 'hot',
    source: 'Instagram',
    notes: `Interested in ${biz.businessName} — follow up on WhatsApp.`,
  })
  if (!leadError) inserted.lead = true

  const { error: dealError } = await supabase.from('crm_deals').insert({
    organization_id: org,
    title: `Bulk order — ${biz.businessName}`,
    stage: 'proposal',
    value_bdt: 85000,
    next_step: 'Send quote on WhatsApp',
  })
  if (!dealError) inserted.deal = true

  const { error: invError } = await supabase.from('money_invoices').insert({
    organization_id: org,
    number: `INV-${Date.now().toString().slice(-4)}`,
    status: 'sent',
    total_bdt: 12500,
    due_at: new Date(Date.now() + 86400_000 * 5).toISOString().slice(0, 10),
    notes: `Sample invoice for ${biz.businessName}`,
  })
  if (!invError) inserted.invoice = true

  const { error: actError } = await supabase.from('freya_activity_items').insert({
    organization_id: org,
    kind: 'info',
    title: 'Demo seed ready',
    summary: `Test data loaded for ${biz.businessName}: post, inbox, lead, deal, invoice.`,
    status: 'info',
    payload: { action: 'noop' },
    created_by: userId,
  })
  if (!actError) inserted.activity = true

  return {
    organizationId: org,
    userId,
    email: opts.email ?? null,
    businessName: biz.businessName,
    inserted,
  }
}

/** Find Auth user by email via service-role admin API (paginated). */
export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string; email?: string } | null> {
  const target = email.trim().toLowerCase()
  if (!target || !target.includes('@')) return null

  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const users = data.users ?? []
    const hit = users.find((u) => (u.email || '').toLowerCase() === target)
    if (hit) return { id: hit.id, email: hit.email }
    if (users.length < 200) return null
    page += 1
    if (page > 50) return null
  }
}

export function parseAdminEmails(raw = process.env.ADMIN_EMAILS): string[] {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return parseAdminEmails().includes(email.trim().toLowerCase())
}

/** Bearer ADMIN_SEED_SECRET (preferred) or CRON_SECRET. */
export function adminSeedSecretOk(req: Request): boolean {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.ADMIN_SEED_SECRET || process.env.CRON_SECRET
  return Boolean(secret && auth === `Bearer ${secret}`)
}
