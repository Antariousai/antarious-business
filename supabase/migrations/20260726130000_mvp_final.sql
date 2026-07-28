-- Antarious MVP final pass:
--   * Money: transaction reconciliation columns, ledger accounts, cashflow snapshots
--   * Discover: trends table + competitor watch detail columns
--   * RLS: insert policies for credit ledger + usage events (were select-only)
-- Apply after 20260726120000_init.sql

-- ─── AI metering: allow members to write ledger + usage rows ──────────────────
-- The init migration enabled RLS with select-only policies, which blocked the
-- spendCredits() / usage logging inserts made with the caller's session client.
do $$ begin
  create policy ledger_insert on public.ai_credit_ledger for insert
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy usage_insert on public.ai_usage_events for insert
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

-- Token counts are back-filled after a streamed run finishes.
do $$ begin
  create policy usage_update on public.ai_usage_events for update
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

-- Approve engine writes audit rows with the caller's session client; the init
-- migration only granted select, which blocked the insert under RLS.
do $$ begin
  create policy faudit_insert on public.freya_audit_log for insert
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

-- ─── Money: transaction reconciliation state ─────────────────────────────────
alter table public.money_transactions
  add column if not exists txn_date date not null default current_date,
  add column if not exists status text not null default 'unmatched',
  add column if not exists category text,
  add column if not exists matched_type text,
  add column if not exists matched_ref text,
  add column if not exists matched_label text,
  add column if not exists freya_match_confidence int;

create index if not exists money_transactions_org_idx
  on public.money_transactions(organization_id, txn_date desc);

-- ─── Money: chart of accounts (ledger) ───────────────────────────────────────
create table if not exists public.money_ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null default 'expense',
  balance_bdt numeric(14,2) not null default 0,
  budget_monthly_bdt numeric(14,2),
  watchlist boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create trigger money_ledger_accounts_updated_at before update on public.money_ledger_accounts
  for each row execute function public.set_updated_at();

-- ─── Money: monthly cashflow snapshots ───────────────────────────────────────
create table if not exists public.money_cashflow_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  month text not null,
  cash_in_bdt numeric(14,2) not null default 0,
  cash_out_bdt numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, month)
);

create trigger money_cashflow_snapshots_updated_at before update on public.money_cashflow_snapshots
  for each row execute function public.set_updated_at();

-- ─── Discover: trends ────────────────────────────────────────────────────────
create table if not exists public.discover_trends (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  summary text,
  direction text not null default 'up',
  change_label text,
  topic text,
  freya_tip text,
  created_at timestamptz not null default now()
);

create index if not exists discover_trends_org_idx
  on public.discover_trends(organization_id, created_at desc);

-- ─── Discover: competitor watch detail columns ───────────────────────────────
alter table public.competitor_watches
  add column if not exists last_move text,
  add column if not exists threat text not null default 'low',
  add column if not exists freya_take text;

-- ─── RLS on new tables ───────────────────────────────────────────────────────
alter table public.money_ledger_accounts enable row level security;
alter table public.money_cashflow_snapshots enable row level security;
alter table public.discover_trends enable row level security;

do $$ begin
  create policy ledger_accounts_all on public.money_ledger_accounts for all
    using (public.is_org_member(organization_id))
    with check (public.can_edit_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy cashflow_all on public.money_cashflow_snapshots for all
    using (public.is_org_member(organization_id))
    with check (public.can_edit_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy trends_all on public.discover_trends for all
    using (public.is_org_member(organization_id))
    with check (public.can_edit_org(organization_id));
exception when duplicate_object then null; end $$;
