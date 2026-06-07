-- Marcadores monitorados pelo médico por paciente
-- Execute no Supabase SQL Editor

create table if not exists public.doctor_watched_biomarkers (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references public.profiles not null,
  patient_id  uuid references public.profiles not null,
  slug        text not null,
  name        text not null,
  created_at  timestamptz default now(),
  unique(doctor_id, patient_id, slug)
);

alter table public.doctor_watched_biomarkers enable row level security;

-- Médico gerencia seus próprios marcadores monitorados
create policy "doctor manages watched biomarkers"
  on public.doctor_watched_biomarkers for all
  using  (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

-- Paciente pode ver quais marcadores seus médicos estão acompanhando
create policy "patient reads watched biomarkers"
  on public.doctor_watched_biomarkers for select
  using (auth.uid() = patient_id);
