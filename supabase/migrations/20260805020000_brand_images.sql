-- Brand images for Home hero (cover + shop logo)
alter table public.business_profiles
  add column if not exists cover_path text,
  add column if not exists logo_path text;
