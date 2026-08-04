-- Org-custom funnel steps for Interested people (leads) and Customers (crm).

create table if not exists public.funnel_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funnel text not null check (funnel in ('leads', 'crm')),
  key text not null,
  label text not null,
  position int not null default 0,
  color text not null default '#38bdf8',
  probability int,
  is_closed boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, funnel, key)
);

create index if not exists funnel_stages_org_funnel_idx
  on public.funnel_stages (organization_id, funnel, position);

alter table public.funnel_stages enable row level security;

create policy funnel_stages_select on public.funnel_stages
  for select using (public.is_org_member(organization_id));

create policy funnel_stages_insert on public.funnel_stages
  for insert with check (public.can_edit_org(organization_id));

create policy funnel_stages_update on public.funnel_stages
  for update using (public.can_edit_org(organization_id))
  with check (public.can_edit_org(organization_id));

create policy funnel_stages_delete on public.funnel_stages
  for delete using (public.can_edit_org(organization_id));

-- Seed default stages for every existing org (idempotent).
insert into public.funnel_stages (organization_id, funnel, key, label, position, color, probability, is_closed, is_default)
select o.id, v.funnel, v.key, v.label, v.position, v.color, v.probability, v.is_closed, v.is_default
from public.organizations o
cross join (
  values
    ('leads', 'new', 'New', 0, '#38bdf8', null::int, false, true),
    ('leads', 'contacted', 'Contacted', 1, '#f97316', null, false, false),
    ('leads', 'qualified', 'Qualified', 2, '#14b8a6', null, false, false),
    ('leads', 'converted', 'Converted', 3, '#22c55e', null, false, false),
    ('crm', 'qualified', 'New', 0, '#579bfc', 20, false, true),
    ('crm', 'meeting', 'Talking', 1, '#38bdf8', 40, false, false),
    ('crm', 'proposal', 'Quote sent', 2, '#fdab3d', 60, false, false),
    ('crm', 'negotiation', 'Almost there', 3, '#ff642e', 80, false, false),
    ('crm', 'won', 'Won', 4, '#00c875', 100, true, false),
    ('crm', 'lost', 'Lost', 5, '#c4c4c4', 0, true, false)
) as v(funnel, key, label, position, color, probability, is_closed, is_default)
on conflict (organization_id, funnel, key) do nothing;
