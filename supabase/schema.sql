-- HealthAxis — Schema completo
-- Execute no Supabase: SQL Editor → New query → cole tudo → Run

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- PERFIL DO USUÁRIO
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  dob date,
  blood text,
  height numeric(5,1),
  weight numeric(5,1),
  avatar_url text,
  created_at timestamptz default now()
);

-- Trigger: cria perfil automaticamente ao registrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- BIOMARCADORES
-- =============================================
create table public.biomarkers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  slug text not null,
  name text not null,
  value text not null,
  unit text not null,
  reference jsonb default '{}',
  status text check (status in ('optimal','attention','high','low','critical')) default 'optimal',
  trend text check (trend in ('up','down','stable')) default 'stable',
  category text not null,
  last_date date default current_date,
  created_at timestamptz default now(),
  unique(user_id, slug)
);

-- =============================================
-- HISTÓRICO DE BIOMARCADORES
-- =============================================
create table public.biomarker_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  biomarker_slug text not null,
  date_label text not null,
  value numeric not null,
  recorded_at date default current_date,
  created_at timestamptz default now()
);

-- =============================================
-- DOCUMENTOS / EXAMES
-- =============================================
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  title text not null,
  type text not null,
  date date not null,
  lab text,
  status text check (status in ('reviewed','pending','processing')) default 'pending',
  tags text[] default '{}',
  file_url text,
  created_at timestamptz default now(),
  -- Pipeline de extração de documentos (OCR via Claude Haiku).
  -- Ver supabase/migrations/20260614195358_add_document_extraction_columns.sql
  extraction_status text not null default 'uploaded',  -- uploaded | processing | processed | error
  extraction_progress integer not null default 0,      -- 0–100, alimenta a barra de progresso
  extraction_message text,                              -- mensagem da etapa atual exibida ao usuário
  extraction_error text,                                -- detalhe do erro quando a extração falha
  extracted_at timestamp with time zone                 -- conclusão (extraction_status = processed)
);

-- =============================================
-- MEDICAMENTOS / SUPLEMENTOS
-- =============================================
create table public.medications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  dose text,
  frequency text,
  since date,
  prescribed boolean default true,
  active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- HISTÓRICO FAMILIAR
-- =============================================
create table public.family_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  condition text not null,
  relation text not null,
  onset text,
  created_at timestamptz default now()
);

-- =============================================
-- LINHA DO TEMPO (EVENTOS)
-- =============================================
create table public.timeline_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  date date not null,
  type text check (type in ('exam','consult','vaccine','checkup','procedure')) not null,
  title text not null,
  description text,
  icon text default 'activity',
  created_at timestamptz default now()
);

-- =============================================
-- LEMBRETES PREVENTIVOS
-- =============================================
create table public.preventive_reminders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  priority text check (priority in ('low','medium','high')) default 'medium',
  icon text default 'calendar',
  done boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- HEALTH SCORE
-- =============================================
create table public.health_scores (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  overall integer default 0,
  metabolic integer default 0,
  cardiovascular integer default 0,
  lifestyle integer default 0,
  preventive integer default 0,
  updated_at timestamptz default now(),
  unique(user_id)
);

-- =============================================
-- ROW LEVEL SECURITY (cada user vê só seus dados)
-- =============================================
alter table public.profiles enable row level security;
alter table public.biomarkers enable row level security;
alter table public.biomarker_history enable row level security;
alter table public.documents enable row level security;
alter table public.medications enable row level security;
alter table public.family_history enable row level security;
alter table public.timeline_events enable row level security;
alter table public.preventive_reminders enable row level security;
alter table public.health_scores enable row level security;

-- Políticas RLS
create policy "users can manage their own profile"
  on public.profiles for all using (auth.uid() = id);

create policy "users can manage their own biomarkers"
  on public.biomarkers for all using (auth.uid() = user_id);

create policy "users can manage their own biomarker history"
  on public.biomarker_history for all using (auth.uid() = user_id);

create policy "users can manage their own documents"
  on public.documents for all using (auth.uid() = user_id);

create policy "users can manage their own medications"
  on public.medications for all using (auth.uid() = user_id);

create policy "users can manage their own family history"
  on public.family_history for all using (auth.uid() = user_id);

create policy "users can manage their own timeline events"
  on public.timeline_events for all using (auth.uid() = user_id);

create policy "users can manage their own reminders"
  on public.preventive_reminders for all using (auth.uid() = user_id);

create policy "users can manage their own health score"
  on public.health_scores for all using (auth.uid() = user_id);

-- =============================================
-- STORAGE: arquivos de exames
-- =============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-files',
  'exam-files',
  true,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users can upload their own exam files"
  on storage.objects for insert
  with check (
    bucket_id = 'exam-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users can read their own exam files"
  on storage.objects for select
  using (
    bucket_id = 'exam-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users can update their own exam files"
  on storage.objects for update
  using (
    bucket_id = 'exam-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users can delete their own exam files"
  on storage.objects for delete
  using (
    bucket_id = 'exam-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- SEED: dados de exemplo para primeiro login
-- (executar separado após criar o primeiro usuário)
-- =============================================

-- =============================================
-- GRANTS — permissões explícitas para a API
-- Obrigatório a partir de 30 mai 2026 (novos projetos)
-- =============================================
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

