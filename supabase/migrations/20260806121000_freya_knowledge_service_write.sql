-- Allow service_role writes explicitly (ingest). Select stays for authenticated Freya RPC users.
grant select, insert, update, delete on public.freya_knowledge_chunks to service_role;

drop policy if exists freya_knowledge_service_all on public.freya_knowledge_chunks;
create policy freya_knowledge_service_all on public.freya_knowledge_chunks
  for all
  to service_role
  using (true)
  with check (true);
