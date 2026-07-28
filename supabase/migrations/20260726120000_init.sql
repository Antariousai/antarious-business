-- Antarious MVP schema: multi-tenant orgs + core domains + RLS
-- Apply with: supabase db push / supabase migration up

create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type public.org_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_tier as enum ('starter', 'growth', 'scale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.channel_status as enum ('connected', 'disconnected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.post_status as enum ('draft', 'scheduled', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inbox_message_kind as enum ('customer', 'you', 'freya_draft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_status as enum ('local_only', 'queued', 'sent_stub');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_status as enum ('waiting', 'done', 'dismissed', 'info');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'bkash', 'nagad', 'bank', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed');
exception when duplicate_object then null; end $$;

-- ─── Helpers ─────────────────────────────────────────────────────────────────
-- Org membership helpers (is_org_member / org_role / can_edit_org) are created
-- after public.organization_members — SQL functions require the relation to exist.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── Organizations ───────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My business',
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members(user_id);

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role::text from public.organization_members m
  where m.organization_id = org and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_edit_org(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  );
$$;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  business_name text not null default '',
  industry text,
  customers text,
  business_type text,
  audience_serve text,
  team_size text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_profiles_updated_at before update on public.business_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.business_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  goal_id text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, goal_id)
);

create table if not exists public.channel_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, platform)
);

create table if not exists public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null,
  status public.channel_status not null default 'disconnected',
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform)
);

create table if not exists public.freya_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  tone text not null default 'warm',
  auto_approve boolean not null default false,
  tour_completed boolean not null default false,
  tour_active boolean not null default false,
  tour_step int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_tier public.plan_tier not null default 'starter',
  status text not null default 'active',
  current_period_start timestamptz default date_trunc('month', now()),
  current_period_end timestamptz default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_credit_ledger_org_idx on public.ai_credit_ledger(organization_id, created_at desc);

create or replace function public.credit_balance(org uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::int from public.ai_credit_ledger where organization_id = org;
$$;

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  agent text not null,
  model text,
  input_tokens int default 0,
  output_tokens int default 0,
  credits_spent int default 0,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Signup bootstrap ────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Owner');

  insert into public.profiles (id, full_name)
  values (new.id, display_name)
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.organizations (name)
  values (display_name || '''s business')
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, new.id, 'owner');

  insert into public.business_profiles (organization_id, business_name, onboarded)
  values (org_id, '', false);

  insert into public.freya_preferences (organization_id)
  values (org_id);

  insert into public.subscriptions (organization_id, plan_tier, status)
  values (org_id, 'starter', 'active');

  -- Welcome credits (Starter included)
  insert into public.ai_credit_ledger (organization_id, delta, reason, created_by)
  values (org_id, 1000, 'welcome_starter', new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Content / Posts ─────────────────────────────────────────────────────────
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text,
  caption text not null default '',
  status public.post_status not null default 'draft',
  tag text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_posts_org_idx on public.content_posts(organization_id, scheduled_at);

create table if not exists public.content_post_platforms (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(id) on delete cascade,
  platform text not null,
  unique (post_id, platform)
);

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  post_id uuid references public.content_posts(id) on delete set null,
  storage_path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(id) on delete cascade,
  captured_at timestamptz not null default now(),
  likes int default 0,
  comments int default 0,
  shares int default 0,
  reach int default 0,
  meta jsonb default '{}'::jsonb
);

create table if not exists public.post_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  caption text not null default '',
  platforms text[] default '{}',
  tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Inbox ───────────────────────────────────────────────────────────────────
create table if not exists public.inbox_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject text,
  contact_name text,
  platform text,
  status text not null default 'open',
  unread boolean not null default true,
  last_message_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.inbox_threads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind public.inbox_message_kind not null,
  body text not null,
  delivery_status public.delivery_status not null default 'local_only',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inbox_messages_thread_idx on public.inbox_messages(thread_id, created_at);

-- ─── Freya activity / chat / approvals ───────────────────────────────────────
create table if not exists public.freya_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.freya_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.freya_conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null,
  content text not null default '',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.freya_activity_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  title text not null,
  summary text,
  status public.activity_status not null default 'waiting',
  payload jsonb not null default '{}'::jsonb,
  href text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.freya_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  activity_id uuid references public.freya_activity_items(id) on delete set null,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  detail jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Leads ───────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  company text,
  phone text,
  email text,
  stage text not null default 'new',
  temperature text default 'warm',
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_tags (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  tag text not null,
  unique (lead_id, tag)
);

create table if not exists public.lead_stage_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── CRM ─────────────────────────────────────────────────────────────────────
create table if not exists public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  industry text,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.crm_companies(id) on delete set null,
  name text not null,
  email text,
  phone text,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.crm_companies(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  title text not null,
  stage text not null default 'qualified',
  value_bdt numeric(14,2) default 0,
  next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid references public.crm_deals(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  kind text not null default 'task',
  title text not null,
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  body text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Money (BDT bookkeeping) ─────────────────────────────────────────────────
create table if not exists public.money_parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'customer',
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.money_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'cash',
  balance_bdt numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.money_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  party_id uuid references public.money_parties(id) on delete set null,
  number text,
  status text not null default 'draft',
  total_bdt numeric(14,2) not null default 0,
  due_at date,
  paid_at timestamptz,
  payment_method public.payment_method,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.money_invoices(id) on delete cascade,
  description text not null,
  qty numeric(12,2) not null default 1,
  unit_bdt numeric(14,2) not null default 0
);

create table if not exists public.money_bills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  party_id uuid references public.money_parties(id) on delete set null,
  number text,
  status text not null default 'open',
  total_bdt numeric(14,2) not null default 0,
  due_at date,
  paid_at timestamptz,
  payment_method public.payment_method,
  created_at timestamptz not null default now()
);

create table if not exists public.money_bill_lines (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.money_bills(id) on delete cascade,
  description text not null,
  qty numeric(12,2) not null default 1,
  unit_bdt numeric(14,2) not null default 0
);

create table if not exists public.money_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text,
  description text not null,
  amount_bdt numeric(14,2) not null,
  spent_at date default current_date,
  payment_method public.payment_method default 'cash',
  created_at timestamptz not null default now()
);

create table if not exists public.money_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid references public.money_accounts(id) on delete set null,
  amount_bdt numeric(14,2) not null,
  direction text not null default 'in',
  memo text,
  invoice_id uuid references public.money_invoices(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Campaigns ───────────────────────────────────────────────────────────────
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  goal text,
  audience text,
  platforms text[] default '{}',
  budget_bdt numeric(14,2) default 0,
  objective text,
  tone text,
  status public.campaign_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_setups (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references public.campaigns(id) on delete cascade,
  brief jsonb default '{}'::jsonb
);

create table if not exists public.campaign_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  headline text,
  body text,
  asset_path text
);

create table if not exists public.campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  captured_at timestamptz not null default now(),
  impressions int default 0,
  clicks int default 0,
  spend_bdt numeric(14,2) default 0
);

-- ─── Discover ────────────────────────────────────────────────────────────────
create table if not exists public.discover_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'new',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  caption text,
  status text not null default 'saved',
  created_at timestamptz not null default now()
);

create table if not exists public.competitor_watches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.discover_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ─── Team invites ────────────────────────────────────────────────────────────
create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'editor',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.business_profiles enable row level security;
alter table public.business_goals enable row level security;
alter table public.channel_preferences enable row level security;
alter table public.channel_connections enable row level security;
alter table public.freya_preferences enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_credit_ledger enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.content_posts enable row level security;
alter table public.content_post_platforms enable row level security;
alter table public.content_assets enable row level security;
alter table public.content_metric_snapshots enable row level security;
alter table public.post_templates enable row level security;
alter table public.inbox_threads enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.freya_conversations enable row level security;
alter table public.freya_messages enable row level security;
alter table public.freya_activity_items enable row level security;
alter table public.freya_audit_log enable row level security;
alter table public.leads enable row level security;
alter table public.lead_tags enable row level security;
alter table public.lead_stage_events enable row level security;
alter table public.crm_companies enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_insights enable row level security;
alter table public.money_parties enable row level security;
alter table public.money_accounts enable row level security;
alter table public.money_invoices enable row level security;
alter table public.money_invoice_lines enable row level security;
alter table public.money_bills enable row level security;
alter table public.money_bill_lines enable row level security;
alter table public.money_expenses enable row level security;
alter table public.money_transactions enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_setups enable row level security;
alter table public.campaign_creatives enable row level security;
alter table public.campaign_metrics enable row level security;
alter table public.discover_signals enable row level security;
alter table public.content_ideas enable row level security;
alter table public.competitor_watches enable row level security;
alter table public.discover_insights enable row level security;
alter table public.team_invitations enable row level security;

-- Profiles
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid());

-- Org membership
create policy org_select on public.organizations for select using (public.is_org_member(id));
create policy org_update on public.organizations for update using (public.org_role(id) = 'owner');

create policy members_select on public.organization_members for select
  using (public.is_org_member(organization_id));
create policy members_insert on public.organization_members for insert
  with check (public.org_role(organization_id) = 'owner');
create policy members_update on public.organization_members for update
  using (public.org_role(organization_id) = 'owner');
create policy members_delete on public.organization_members for delete
  using (public.org_role(organization_id) = 'owner');

-- Generic org-scoped policies helper pattern
create policy bp_all on public.business_profiles for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy bg_all on public.business_goals for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy cp_all on public.channel_preferences for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy cc_all on public.channel_connections for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy fp_all on public.freya_preferences for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy sub_select on public.subscriptions for select using (public.is_org_member(organization_id));
create policy sub_update on public.subscriptions for update using (public.org_role(organization_id) = 'owner');
create policy ledger_select on public.ai_credit_ledger for select using (public.is_org_member(organization_id));
create policy usage_select on public.ai_usage_events for select using (public.is_org_member(organization_id));

create policy posts_all on public.content_posts for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy post_plat_all on public.content_post_platforms for all
  using (exists (select 1 from public.content_posts p where p.id = post_id and public.is_org_member(p.organization_id)))
  with check (exists (select 1 from public.content_posts p where p.id = post_id and public.can_edit_org(p.organization_id)));
create policy assets_all on public.content_assets for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy metrics_all on public.content_metric_snapshots for all
  using (exists (select 1 from public.content_posts p where p.id = post_id and public.is_org_member(p.organization_id)))
  with check (exists (select 1 from public.content_posts p where p.id = post_id and public.can_edit_org(p.organization_id)));
create policy templates_all on public.post_templates for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));

create policy threads_all on public.inbox_threads for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy messages_all on public.inbox_messages for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));

create policy conv_all on public.freya_conversations for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy fmsg_all on public.freya_messages for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy fact_all on public.freya_activity_items for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy faudit_select on public.freya_audit_log for select using (public.is_org_member(organization_id));

create policy leads_all on public.leads for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy ltags_all on public.lead_tags for all
  using (exists (select 1 from public.leads l where l.id = lead_id and public.is_org_member(l.organization_id)))
  with check (exists (select 1 from public.leads l where l.id = lead_id and public.can_edit_org(l.organization_id)));
create policy lstage_all on public.lead_stage_events for all
  using (exists (select 1 from public.leads l where l.id = lead_id and public.is_org_member(l.organization_id)))
  with check (exists (select 1 from public.leads l where l.id = lead_id and public.can_edit_org(l.organization_id)));

create policy companies_all on public.crm_companies for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy contacts_all on public.crm_contacts for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy deals_all on public.crm_deals for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy cact_all on public.crm_activities for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy cins_all on public.crm_insights for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));

create policy parties_all on public.money_parties for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy accounts_all on public.money_accounts for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy invoices_all on public.money_invoices for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy ilines_all on public.money_invoice_lines for all
  using (exists (select 1 from public.money_invoices i where i.id = invoice_id and public.is_org_member(i.organization_id)))
  with check (exists (select 1 from public.money_invoices i where i.id = invoice_id and public.can_edit_org(i.organization_id)));
create policy bills_all on public.money_bills for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy blines_all on public.money_bill_lines for all
  using (exists (select 1 from public.money_bills b where b.id = bill_id and public.is_org_member(b.organization_id)))
  with check (exists (select 1 from public.money_bills b where b.id = bill_id and public.can_edit_org(b.organization_id)));
create policy expenses_all on public.money_expenses for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy txns_all on public.money_transactions for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));

create policy campaigns_all on public.campaigns for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy csetup_all on public.campaign_setups for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_org_member(c.organization_id)))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.can_edit_org(c.organization_id)));
create policy ccreat_all on public.campaign_creatives for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_org_member(c.organization_id)))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.can_edit_org(c.organization_id)));
create policy cmet_all on public.campaign_metrics for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_org_member(c.organization_id)))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.can_edit_org(c.organization_id)));

create policy signals_all on public.discover_signals for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy ideas_all on public.content_ideas for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy watches_all on public.competitor_watches for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));
create policy dinsights_all on public.discover_insights for all using (public.is_org_member(organization_id)) with check (public.can_edit_org(organization_id));

create policy invites_all on public.team_invitations for all using (public.is_org_member(organization_id)) with check (public.org_role(organization_id) = 'owner');

-- Storage buckets (run in dashboard or via storage API; SQL for reference)
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', false), ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy post_media_rw on storage.objects for all
  using (bucket_id = 'post-media' and auth.role() = 'authenticated')
  with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

create policy receipts_rw on storage.objects for all
  using (bucket_id = 'receipts' and auth.role() = 'authenticated')
  with check (bucket_id = 'receipts' and auth.role() = 'authenticated');
