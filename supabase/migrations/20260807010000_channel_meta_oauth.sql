-- Meta OAuth fields for real Page / Instagram / Messenger connections.
alter table public.channel_connections
  add column if not exists provider text,
  add column if not exists external_page_id text,
  add column if not exists external_ig_user_id text,
  add column if not exists page_name text,
  add column if not exists access_token text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists scopes text,
  add column if not exists meta_user_id text;

comment on column public.channel_connections.access_token is
  'Page access token — never expose via public API select lists.';
