-- Deduplicacao de laudos por conteudo, identificador do laboratorio e resultados.
-- Execute no SQL Editor do Supabase antes de publicar a aplicacao.

alter table public.documents add column if not exists content_hash text;
alter table public.documents add column if not exists source_lab text;
alter table public.documents add column if not exists external_order_id text;
alter table public.documents add column if not exists external_order_type text;
alter table public.documents add column if not exists semantic_fingerprint text;

create unique index if not exists documents_unique_content_hash
  on public.documents (user_id, content_hash)
  where content_hash is not null;

create unique index if not exists documents_unique_external_order
  on public.documents (user_id, source_lab, external_order_type, external_order_id)
  where source_lab is not null and external_order_type is not null and external_order_id is not null;

create unique index if not exists documents_unique_semantic_fingerprint
  on public.documents (user_id, semantic_fingerprint)
  where semantic_fingerprint is not null;
