-- HealthAxis — GRANTs explícitos para a API do Supabase
-- Execute no Supabase: SQL Editor → New query → cole tudo → Run
--
-- Necessário a partir de 30 mai 2026: novos projetos não expõem tabelas
-- do esquema public à API (PostgREST / supabase-js) por padrão.
-- Projetos existentes precisam rodar isso antes de 30 out 2026.
--
-- Referência: https://supabase.com/changelog

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables    in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;

-- Garante que tabelas criadas futuramente também tenham acesso automático
alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
