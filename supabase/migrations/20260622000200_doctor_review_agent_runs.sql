-- Allow linked doctors to update human review fields on agent runs.
-- This supports accepted/edited/rejected review with human-in-the-loop governance.

drop policy if exists "doctor can review linked patient agent runs"
on public.agent_runs;

create policy "doctor can review linked patient agent runs"
on public.agent_runs
for update
to authenticated
using (
  exists (
    select 1
    from public.doctor_patient_links l
    where l.patient_id = agent_runs.patient_id
      and l.doctor_id = auth.uid()
      and l.revoked_at is null
  )
)
with check (
  exists (
    select 1
    from public.doctor_patient_links l
    where l.patient_id = agent_runs.patient_id
      and l.doctor_id = auth.uid()
      and l.revoked_at is null
  )
);

create index if not exists idx_agent_runs_patient_human_decision
  on public.agent_runs (patient_id, human_decision, completed_at desc);
