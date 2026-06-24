-- =============================================================================
-- PLANOS DE CUIDADO (Fase 6) — médico no comando, com trilha de auditoria
-- =============================================================================
-- Modelo clínico longitudinal: o médico cria o plano, define metas e prescreve
-- hábitos; o paciente registra check-ins de adesão. Nada autônomo: toda escrita
-- parte de um humano autenticado e é auditada em care_plan_events.
--
-- Aplicar no Supabase (SQL Editor). RLS é deny-by-default; políticas explícitas.
-- =============================================================================

-- PLANO ----------------------------------------------------------------------
create table if not exists public.care_plans (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles(id) on delete cascade,
  doctor_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'Plano de cuidado',
  summary     text,
  status      text not null default 'active' check (status in ('active','paused','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_care_plans_patient on public.care_plans(patient_id);
create index if not exists idx_care_plans_doctor  on public.care_plans(doctor_id);

-- METAS ----------------------------------------------------------------------
create table if not exists public.care_goals (
  id            uuid primary key default gen_random_uuid(),
  care_plan_id  uuid not null references public.care_plans(id) on delete cascade,
  description   text not null,
  metric        text,           -- ex.: "HbA1c", "peso", "passos/dia"
  target        text,           -- ex.: "< 5.7%", "-5 kg", "8000"
  due_date      date,
  status        text not null default 'open' check (status in ('open','met','missed','paused')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_care_goals_plan on public.care_goals(care_plan_id);

-- HÁBITOS PRESCRITOS ---------------------------------------------------------
create table if not exists public.prescribed_habits (
  id            uuid primary key default gen_random_uuid(),
  care_plan_id  uuid not null references public.care_plans(id) on delete cascade,
  title         text not null,
  frequency     text,           -- ex.: "diário", "3x/semana"
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_prescribed_habits_plan on public.prescribed_habits(care_plan_id);

-- CHECK-INS (registrados pelo paciente) --------------------------------------
create table if not exists public.care_check_ins (
  id            uuid primary key default gen_random_uuid(),
  care_plan_id  uuid not null references public.care_plans(id) on delete cascade,
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  note          text,
  adherence     integer check (adherence between 0 and 100),
  created_at    timestamptz not null default now()
);
create index if not exists idx_care_check_ins_plan on public.care_check_ins(care_plan_id);

-- AUDITORIA ------------------------------------------------------------------
create table if not exists public.care_plan_events (
  id            uuid primary key default gen_random_uuid(),
  care_plan_id  uuid references public.care_plans(id) on delete set null,
  actor_id      uuid not null references public.profiles(id) on delete cascade,
  action        text not null,  -- ex.: plan_created, goal_added, habit_prescribed, check_in
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists idx_care_plan_events_plan on public.care_plan_events(care_plan_id);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.care_plans         enable row level security;
alter table public.care_goals         enable row level security;
alter table public.prescribed_habits  enable row level security;
alter table public.care_check_ins     enable row level security;
alter table public.care_plan_events   enable row level security;

-- Vínculo ativo médico↔paciente (iniciado pelo paciente, não revogado).
create or replace function public.has_active_link(p_doctor uuid, p_patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.doctor_patient_links
    where doctor_id = p_doctor and patient_id = p_patient and revoked_at is null
  );
$$;

-- PLANO: médico dono com vínculo ativo gerencia; paciente lê o próprio.
create policy care_plans_doctor_all on public.care_plans
  for all using (doctor_id = auth.uid() and public.has_active_link(auth.uid(), patient_id))
  with check (doctor_id = auth.uid() and public.has_active_link(auth.uid(), patient_id));
create policy care_plans_patient_read on public.care_plans
  for select using (patient_id = auth.uid());

-- Função auxiliar: o usuário pode ver/gerenciar este plano?
create or replace function public.can_manage_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.care_plans cp
    where cp.id = p_plan and cp.doctor_id = auth.uid()
      and public.has_active_link(auth.uid(), cp.patient_id)
  );
$$;
create or replace function public.can_read_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.care_plans cp
    where cp.id = p_plan and (cp.patient_id = auth.uid() or cp.doctor_id = auth.uid())
  );
$$;

-- METAS / HÁBITOS: médico gerencia; ambos leem.
create policy care_goals_manage on public.care_goals
  for all using (public.can_manage_plan(care_plan_id)) with check (public.can_manage_plan(care_plan_id));
create policy care_goals_read on public.care_goals
  for select using (public.can_read_plan(care_plan_id));

create policy prescribed_habits_manage on public.prescribed_habits
  for all using (public.can_manage_plan(care_plan_id)) with check (public.can_manage_plan(care_plan_id));
create policy prescribed_habits_read on public.prescribed_habits
  for select using (public.can_read_plan(care_plan_id));

-- CHECK-INS: paciente insere os próprios; ambos leem.
create policy care_check_ins_insert on public.care_check_ins
  for insert with check (patient_id = auth.uid() and public.can_read_plan(care_plan_id));
create policy care_check_ins_read on public.care_check_ins
  for select using (public.can_read_plan(care_plan_id));

-- AUDITORIA: leitura por quem participa do plano; escrita pelo app (service role).
create policy care_plan_events_read on public.care_plan_events
  for select using (care_plan_id is null or public.can_read_plan(care_plan_id));
