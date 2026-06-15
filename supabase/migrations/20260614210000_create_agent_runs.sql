-- Tabela de auditoria de execuções de agentes IA.
--
-- Garante trilha de auditoria obrigatória antes de qualquer execução de agente:
-- a rota só prossegue se o INSERT nesta tabela for bem-sucedido.
-- Suporta revisão humana (human_decision) por médicos vinculados.
--
-- Idempotente: "create table if not exists", "create index if not exists",
-- "create policy if not exists" — pode ser reaplicada com segurança.

create type if not exists agent_run_status as enum ('running', 'completed', 'failed', 'halted');
create type if not exists agent_human_decision as enum ('pending', 'accepted', 'edited', 'rejected');

create table if not exists public.agent_runs (
  id                  uuid primary key default gen_random_uuid(),
  agent_name          text not null,
  patient_id          uuid not null references public.profiles(id) on delete cascade,
  triggered_by        uuid not null references public.profiles(id),

  input_summary       jsonb not null default '{}',
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
drop policy if exists "linked doctor reads agent runs" on public.agent_runs;
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
drop policy if exists "patient reads own agent runs" on public.agent_runs;
create policy "patient reads own agent runs" on public.agent_runs
  for select using (patient_id = auth.uid());

-- Qualquer usuário autenticado pode criar uma execução onde é o triggering user
drop policy if exists "authenticated users create agent runs" on public.agent_runs;
create policy "authenticated users create agent runs" on public.agent_runs
  for insert with check (triggered_by = auth.uid());

-- Usuário que disparou a execução atualiza o lifecycle (status, output, tokens)
drop policy if exists "triggering user updates own agent run" on public.agent_runs;
create policy "triggering user updates own agent run" on public.agent_runs
  for update using (triggered_by = auth.uid())
  with check (triggered_by = auth.uid());

-- Médico vinculado registra decisão humana (accept / edit / reject)
drop policy if exists "linked doctor decides on agent run" on public.agent_runs;
create policy "linked doctor decides on agent run" on public.agent_runs
  for update using (
    exists (
      select 1 from public.doctor_patient_links l
      where l.patient_id = agent_runs.patient_id
        and l.doctor_id  = auth.uid()
        and l.revoked_at is null
    )
  );

comment on table public.agent_runs is 'Trilha de auditoria de execuções de agentes IA. Cada execução requer persistência aqui antes de rodar.';
comment on column public.agent_runs.tools_called is 'Log de chamadas de ferramentas: [{tool, args_hash, status, started_at, finished_at}]. args_hash é SHA256 dos args — sem PHI.';
comment on column public.agent_runs.human_decision is 'Decisão do médico sobre o output: pending | accepted | edited | rejected.';
