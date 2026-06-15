-- Camada de agentes: trilha de auditoria de execuções.
-- Rodar uma vez no SQL editor do Supabase.

create type agent_run_status as enum ('running', 'completed', 'failed', 'halted');
create type agent_human_decision as enum ('pending', 'accepted', 'edited', 'rejected');

create table if not exists public.agent_runs (
  id                  uuid primary key default gen_random_uuid(),
  agent_name          text not null,
  patient_id          uuid not null references public.profiles(id) on delete cascade,
  triggered_by        uuid not null references public.profiles(id),

  -- Resumo sanitizado da entrada (sem dump de PHI)
  input_summary       jsonb not null default '{}',
  -- Cada item: { tool, args_hash, status, started_at, finished_at }
  tools_called        jsonb not null default '[]',
  iterations          int not null default 0,

  model_used          text,
  tokens_input        int,
  tokens_output       int,
  estimated_cost      numeric(10,4),
  confidence_score    numeric(4,3),

  output_json         jsonb,

  human_decision      agent_human_decision not null default 'pending',
  human_decision_by   uuid references public.profiles(id),
  human_decision_at   timestamptz,
  edited_output       jsonb,

  status              agent_run_status not null default 'running',
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index if not exists agent_runs_patient_date   on public.agent_runs (patient_id, created_at desc);
create index if not exists agent_runs_agent_status   on public.agent_runs (agent_name, status);
create index if not exists agent_runs_triggered_date on public.agent_runs (triggered_by, created_at desc);

alter table public.agent_runs enable row level security;

-- Médico vinculado (link ativo) lê execuções do paciente
create policy "linked doctor reads agent runs" on public.agent_runs
  for select using (
    exists (
      select 1 from public.doctor_patient_links l
      where l.patient_id = agent_runs.patient_id
        and l.doctor_id  = auth.uid()
        and l.revoked_at is null
    )
  );

-- Paciente lê suas próprias execuções
create policy "patient reads own agent runs" on public.agent_runs
  for select using (patient_id = auth.uid());

-- Médico registra decisão humana (accept / edit / reject)
create policy "linked doctor decides on agent run" on public.agent_runs
  for update using (
    exists (
      select 1 from public.doctor_patient_links l
      where l.patient_id = agent_runs.patient_id
        and l.doctor_id  = auth.uid()
        and l.revoked_at is null
    )
  );
