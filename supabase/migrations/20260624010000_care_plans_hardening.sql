-- =============================================================================
-- HARDENING — Planos de cuidado (complementa 20260624000000_care_plans.sql)
-- =============================================================================
-- Corrige 3 pontos de segurança/modelagem e adiciona trigger de updated_at.
-- Idempotente: pode rodar mais de uma vez. Aplicar no Supabase (SQL Editor).
-- =============================================================================

-- (1) can_read_plan: o médico só lê se o vínculo estiver ATIVO (não revogado).
--     Antes, bastava ser o doctor_id do plano — o que mantinha acesso após a
--     revogação, violando a regra de vínculo revogável iniciado pelo paciente.
create or replace function public.can_read_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.care_plans cp
    where cp.id = p_plan
      and (
        cp.patient_id = auth.uid()
        or (cp.doctor_id = auth.uid() and public.has_active_link(auth.uid(), cp.patient_id))
      )
  );
$$;

-- (2) care_check_ins_insert: garante que o check-in é do paciente DONO do plano
--     (cruza patient_id do check-in com o patient_id do plano), além de ser o
--     próprio usuário autenticado.
drop policy if exists care_check_ins_insert on public.care_check_ins;
create policy care_check_ins_insert on public.care_check_ins
  for insert with check (
    patient_id = auth.uid()
    and exists (
      select 1 from public.care_plans cp
      where cp.id = care_plan_id and cp.patient_id = auth.uid()
    )
  );

-- (3) care_plan_events_read: eventos sem plano (care_plan_id is null) deixam de
--     ser visíveis a qualquer autenticado; só o próprio ator os vê. Eventos com
--     plano continuam restritos a quem participa do plano (com vínculo ativo).
drop policy if exists care_plan_events_read on public.care_plan_events;
create policy care_plan_events_read on public.care_plan_events
  for select using (
    (care_plan_id is not null and public.can_read_plan(care_plan_id))
    or (care_plan_id is null and actor_id = auth.uid())
  );

-- (4) updated_at automático em care_plans (função dedicada, sem colisão).
create or replace function public.care_plans_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_care_plans_updated_at on public.care_plans;
create trigger trg_care_plans_updated_at
  before update on public.care_plans
  for each row execute function public.care_plans_set_updated_at();
