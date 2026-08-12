-- Meta integration foundation: encrypted tokens, social sync tables, webhook events, inbox provider IDs.

-- Real Meta delivery outcomes (legacy sent_stub remains for demo/local).
do $$ begin
  alter type public.delivery_status add value if not exists 'sent';
exception when duplicate_object then null;
end $$;
do $$ begin
  alter type public.delivery_status add value if not exists 'failed';
exception when duplicate_object then null;
end $$;

-- ─── channel_connections extensions ───────────────────────────────────────────
alter table public.channel_connections
  add column if not exists access_token_enc text,
  add column if not exists token_kind text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_error text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.channel_connections.access_token_enc is
  'AES-GCM encrypted Page/IG user token — never expose via API.';
comment on column public.channel_connections.token_kind is
  'page | instagram_user | user';
comment on column public.channel_connections.access_token is
  'Legacy plaintext Page token. Prefer access_token_enc. Cleared after encrypt migration.';

-- ─── Freya inbox AI mode ──────────────────────────────────────────────────────
alter table public.freya_preferences
  add column if not exists inbox_ai_mode text not null default 'suggest';

alter table public.freya_preferences
  drop constraint if exists freya_preferences_inbox_ai_mode_check;
alter table public.freya_preferences
  add constraint freya_preferences_inbox_ai_mode_check
  check (inbox_ai_mode in ('off', 'suggest', 'auto'));

-- ─── Inbox provider linkage ───────────────────────────────────────────────────
alter table public.inbox_threads
  add column if not exists connection_id uuid references public.channel_connections(id) on delete set null,
  add column if not exists provider text,
  add column if not exists provider_conversation_id text,
  add column if not exists social_contact_id uuid,
  add column if not exists assigned_user_id uuid references auth.users(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists inbox_threads_provider_convo_uidx
  on public.inbox_threads (organization_id, provider, provider_conversation_id)
  where provider_conversation_id is not null;

alter table public.inbox_messages
  add column if not exists provider_message_id text,
  add column if not exists direction text,
  add column if not exists sender_type text,
  add column if not exists content_type text not null default 'text',
  add column if not exists provider_timestamp timestamptz,
  add column if not exists raw_payload jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists inbox_messages_provider_msg_uidx
  on public.inbox_messages (organization_id, provider_message_id)
  where provider_message_id is not null;

-- ─── Social contacts ──────────────────────────────────────────────────────────
create table if not exists public.social_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  username text,
  display_name text,
  profile_picture_url text,
  crm_contact_id uuid references public.crm_contacts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_user_id)
);

create index if not exists social_contacts_org_idx on public.social_contacts(organization_id);

alter table public.inbox_threads
  drop constraint if exists inbox_threads_social_contact_id_fkey;
alter table public.inbox_threads
  add constraint inbox_threads_social_contact_id_fkey
  foreign key (social_contact_id) references public.social_contacts(id) on delete set null;

-- ─── Synced social posts / comments (distinct from content_posts) ─────────────
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.channel_connections(id) on delete set null,
  provider text not null,
  provider_post_id text not null,
  caption text,
  media_type text,
  media_url text,
  permalink text,
  published_at timestamptz,
  comments_count int not null default 0,
  thumbnail_url text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_post_id)
);

create index if not exists social_posts_connection_idx on public.social_posts(connection_id, published_at desc);

create table if not exists public.social_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  provider text not null,
  provider_comment_id text not null,
  parent_provider_comment_id text,
  social_contact_id uuid references public.social_contacts(id) on delete set null,
  author_username text,
  text text not null default '',
  provider_timestamp timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_comment_id)
);

create index if not exists social_comments_post_idx on public.social_comments(social_post_id, provider_timestamp);

-- ─── Webhook events (idempotent) ──────────────────────────────────────────────
create table if not exists public.meta_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  event_key text not null,
  event_type text,
  connection_id uuid references public.channel_connections(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  payload jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'failed')),
  attempts int not null default 0,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_key)
);

create index if not exists meta_webhook_events_status_idx
  on public.meta_webhook_events (status, received_at);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.social_contacts enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_comments enable row level security;
alter table public.meta_webhook_events enable row level security;

drop policy if exists social_contacts_all on public.social_contacts;
create policy social_contacts_all on public.social_contacts for all
  using (public.is_org_member(organization_id))
  with check (public.can_edit_org(organization_id));

drop policy if exists social_posts_all on public.social_posts;
create policy social_posts_all on public.social_posts for all
  using (public.is_org_member(organization_id))
  with check (public.can_edit_org(organization_id));

drop policy if exists social_comments_all on public.social_comments;
create policy social_comments_all on public.social_comments for all
  using (public.is_org_member(organization_id))
  with check (public.can_edit_org(organization_id));

-- Webhook rows are written with service role; org members may read their org's events.
drop policy if exists meta_webhook_events_select on public.meta_webhook_events;
create policy meta_webhook_events_select on public.meta_webhook_events for select
  using (organization_id is not null and public.is_org_member(organization_id));
