-- INSERT policy for agent_runs.
-- Allows any authenticated user to create a run where they are the triggering user.
-- Required for the consultation_prep and metabolic_analysis agents to persist audit records.
create policy "authenticated users create agent runs" on public.agent_runs
  for insert with check (triggered_by = auth.uid());
