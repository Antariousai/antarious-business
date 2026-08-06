-- Freya product knowledge RAG (Antarious Business / credit score / Finance).
create extension if not exists vector;

create table if not exists public.freya_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'antarious_training_knowledge_v1',
  part text,
  heading text,
  content text not null,
  token_estimate int,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists freya_knowledge_chunks_embedding_hnsw
  on public.freya_knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

create index if not exists freya_knowledge_chunks_source_idx
  on public.freya_knowledge_chunks (source);

create or replace function public.match_freya_knowledge(
  query_embedding vector(1536),
  match_count int default 6,
  filter_source text default null
)
returns table (
  id uuid,
  source text,
  part text,
  heading text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.source,
    c.part,
    c.heading,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.freya_knowledge_chunks c
  where filter_source is null or c.source = filter_source
  order by c.embedding <=> query_embedding
  limit least(coalesce(match_count, 6), 20);
$$;

alter table public.freya_knowledge_chunks enable row level security;

drop policy if exists freya_knowledge_select on public.freya_knowledge_chunks;
create policy freya_knowledge_select on public.freya_knowledge_chunks
  for select
  to authenticated
  using (true);

-- Inserts/updates/deletes: service role only (bypasses RLS).
grant select on public.freya_knowledge_chunks to authenticated;
grant execute on function public.match_freya_knowledge(vector, int, text) to authenticated;
grant execute on function public.match_freya_knowledge(vector, int, text) to service_role;
