-- Sistema de Conexão Médico ↔ Paciente
-- Execute no Supabase SQL Editor

-- ── Papel do usuário ────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists role text check (role in ('patient','doctor')) default 'patient';

-- ── Perfil do médico (complementa profiles para role=doctor) ────────────────
create table if not exists public.doctor_profiles (
  id          uuid primary key references public.profiles on delete cascade,
  crm         text not null,
  crm_uf      text not null,
  specialty   text,
  bio         text,
  verified_at timestamptz
);

alter table public.doctor_profiles enable row level security;

create policy "doctor owns own profile"
  on public.doctor_profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Paciente pode ler perfil do médico (para tela de aceite do convite)
create policy "patient reads doctor profile"
  on public.doctor_profiles for select
  using (true);

-- ── Convites gerados pelo médico ─────────────────────────────────────────────
create table if not exists public.doctor_invites (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references public.profiles not null,
  token       text unique not null default gen_random_uuid()::text,
  expires_at  timestamptz not null default now() + interval '30 days',
  used_at     timestamptz,
  used_by     uuid references public.profiles,
  created_at  timestamptz default now()
);

alter table public.doctor_invites enable row level security;

create policy "doctor manages own invites"
  on public.doctor_invites for all
  using  (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

-- ── Vínculos médico ↔ paciente (após consentimento) ──────────────────────────
create table if not exists public.doctor_patient_links (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references public.profiles not null,
  patient_id  uuid references public.profiles not null,
  consent_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  revoked_by  uuid references public.profiles,
  invite_id   uuid references public.doctor_invites,
  created_at  timestamptz default now(),
  unique(doctor_id, patient_id)
);

alter table public.doctor_patient_links enable row level security;

create policy "doctor sees own patients"
  on public.doctor_patient_links for select
  using (auth.uid() = doctor_id);

create policy "patient sees own links"
  on public.doctor_patient_links for select
  using (auth.uid() = patient_id);

create policy "patient revokes own links"
  on public.doctor_patient_links for update
  using (auth.uid() = patient_id);

create policy "patient accepts invite"
  on public.doctor_patient_links for insert
  with check (auth.uid() = patient_id);

-- ── Tokens de compartilhamento de exames ─────────────────────────────────────
create table if not exists public.shared_exam_tokens (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references public.profiles not null,
  doctor_id    uuid references public.profiles,
  token        text unique not null default gen_random_uuid()::text,
  document_ids uuid[] not null default '{}',
  expires_at   timestamptz not null,
  viewed_at    timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz default now()
);

alter table public.shared_exam_tokens enable row level security;

create policy "patient manages own tokens"
  on public.shared_exam_tokens for all
  using  (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

create policy "linked doctor reads shared token"
  on public.shared_exam_tokens for select
  using (
    auth.uid() = doctor_id
    or exists (
      select 1 from public.doctor_patient_links
      where doctor_id = auth.uid()
        and patient_id = shared_exam_tokens.patient_id
        and revoked_at is null
    )
  );

-- ── Funções SECURITY DEFINER (acesso público via token) ──────────────────────

create or replace function public.resolve_doctor_invite(p_token text)
returns table (
  doctor_id   uuid,
  doctor_name text,
  crm         text,
  crm_uf      text,
  specialty   text
)
language sql security definer as $$
  select
    profiles.id,
    profiles.name,
    doctor_profiles.crm,
    doctor_profiles.crm_uf,
    doctor_profiles.specialty
  from public.doctor_invites
  join public.profiles
    on profiles.id = doctor_invites.doctor_id
  join public.doctor_profiles
    on doctor_profiles.id = doctor_invites.doctor_id
  where doctor_invites.token = p_token
    and doctor_invites.expires_at > now()
    and doctor_invites.used_at is null;
$$;

create or replace function public.resolve_shared_token(p_token text)
returns table (
  patient_id   uuid,
  patient_name text,
  document_ids uuid[],
  expires_at   timestamptz
)
language sql security definer as $$
  select
    shared_exam_tokens.patient_id,
    profiles.name,
    shared_exam_tokens.document_ids,
    shared_exam_tokens.expires_at
  from public.shared_exam_tokens
  join public.profiles
    on profiles.id = shared_exam_tokens.patient_id
  where shared_exam_tokens.token = p_token
    and shared_exam_tokens.expires_at > now()
    and shared_exam_tokens.revoked_at is null;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
grant execute on function public.resolve_doctor_invite(text) to anon, authenticated;
grant execute on function public.resolve_shared_token(text)  to anon, authenticated;
