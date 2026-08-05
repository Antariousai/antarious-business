-- Page URLs for connected social channels (open from Home / Freya).
alter table public.channel_connections
  add column if not exists page_url text;
