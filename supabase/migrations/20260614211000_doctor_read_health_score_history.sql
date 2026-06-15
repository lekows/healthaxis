-- Permite que o médico vinculado leia o histórico de health scores do paciente.
--
-- Lacuna identificada: health_scores_history tinha apenas policy "ALL" para o
-- próprio usuário, mas não tinha policy SELECT para médico vinculado.
-- Sem ela, getExamTimeline (usado pelo agente consultation-prep) retornava
-- scoreHistory vazio mesmo com vínculo ativo.

drop policy if exists "doctor reads linked patient health score history" on public.health_scores_history;

create policy "doctor reads linked patient health score history"
  on public.health_scores_history
  for select
  using (
    exists (
      select 1 from public.doctor_patient_links l
      where l.patient_id = health_scores_history.user_id
        and l.doctor_id  = auth.uid()
        and l.revoked_at is null
    )
  );
