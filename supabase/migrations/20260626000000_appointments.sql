-- =============================================================================
-- AGENDAMENTO DE CONSULTAS (Épico #64 — MVP interno: #65 + #66 + #67)
-- =============================================================================
-- Agenda clínica interna como fonte canônica. O médico cria/gerencia consultas
-- dos pacientes vinculados; o paciente pode SOLICITAR consulta (status
-- 'requested') a um médico com vínculo ativo. Nada autônomo: toda escrita parte
-- de um humano autenticado e é auditada em appointment_events.
--
-- Reutiliza profiles + doctor_patient_links + public.has_active_link (criado em
-- 20260624000000_care_plans.sql). Não cria entidade de clínica/organização nem
-- tabelas de calendário externo — isso fica para #68/#69/#71.
--
-- RLS deny-by-default; políticas explícitas. Idempotente. Aplicar no Supabase.
-- =============================================================================

-- CONSULTA (fonte canônica) --------------------------------------------------
create table if not exists public.appointments (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid not null references public.profiles(id) on delete cascade,
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  created_by    uuid not null references public.profiles(id) on delete cascade,
  source        text not null default 'manual'
                  check (source in ('manual','patient_request','system')),
  status        text not null default 'scheduled'
                  check (status in (
                    'requested','pending_confirmation','scheduled','confirmed',
                    'arrived','completed','cancelled','no_show','rescheduled'
                  )),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  timezone      text not null default 'America/Sao_Paulo',
  appointment_type text not null default 'follow_up'
                  check (appointment_type in (
                    'first_visit','follow_up','telemedicine','exam_review','other'
                  )),
  reason        text,            -- motivo operacional, sem dado clínico sensível
  location_name text,
  telemedicine_url text,
  cancellation_reason text,
  cancelled_at  timestamptz,
  cancelled_by  uuid references public.profiles(id) on delete set null,
  rescheduled_from_appointment_id uuid references public.appointments(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint appointments_ends_after_starts check (ends_at > starts_at)
);
create index if not exists idx_appointments_doctor    on public.appointments(doctor_id);
create index if not exists idx_appointments_patient   on public.appointments(patient_id);
create index if not exists idx_appointments_starts_at on public.appointments(starts_at);
create index if not exists idx_appointments_status    on public.appointments(status);

-- AUDITORIA ------------------------------------------------------------------
create table if not exists public.appointment_events (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid references public.appointments(id) on delete cascade,
  actor_id        uuid not null references public.profiles(id) on delete cascade,
  action          text not null,  -- ex.: created, requested, confirmed, rescheduled, cancelled, no_show
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists idx_appointment_events_appt on public.appointment_events(appointment_id);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.appointments       enable row level security;
alter table public.appointment_events enable row level security;

-- Garante o helper de vínculo ativo (já criado em care_plans; redeclarar é seguro).
create or replace function public.has_active_link(p_doctor uuid, p_patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.doctor_patient_links
    where doctor_id = p_doctor and patient_id = p_patient and revoked_at is null
  );
$$;

-- CONSULTA: médico dono com vínculo ativo gerencia tudo.
drop policy if exists appointments_doctor_manage on public.appointments;
create policy appointments_doctor_manage on public.appointments
  for all
  using  (doctor_id = auth.uid() and public.has_active_link(doctor_id, patient_id))
  with check (doctor_id = auth.uid() and public.has_active_link(doctor_id, patient_id));

-- CONSULTA: paciente lê as próprias.
drop policy if exists appointments_patient_read on public.appointments;
create policy appointments_patient_read on public.appointments
  for select using (patient_id = auth.uid());

-- CONSULTA: paciente solicita (apenas 'requested', para si, a médico vinculado).
drop policy if exists appointments_patient_request on public.appointments;
create policy appointments_patient_request on public.appointments
  for insert with check (
    patient_id = auth.uid()
    and created_by = auth.uid()
    and status = 'requested'
    and source = 'patient_request'
    and public.has_active_link(doctor_id, patient_id)
  );

-- AUDITORIA: leitura por quem participa da consulta; escrita só pelo app (service role).
drop policy if exists appointment_events_read on public.appointment_events;
create policy appointment_events_read on public.appointment_events
  for select using (
    appointment_id is not null and exists (
      select 1 from public.appointments a
      where a.id = appointment_events.appointment_id
        and (a.doctor_id = auth.uid() or a.patient_id = auth.uid())
    )
  );

-- updated_at automático (função dedicada, sem colisão).
create or replace function public.appointments_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.appointments_set_updated_at();
