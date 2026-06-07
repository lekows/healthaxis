-- Acesso de leitura do médico vinculado aos dados clínicos do paciente
-- Execute no Supabase SQL Editor.
--
-- Modelo: ao aceitar o vínculo (doctor_patient_links), o médico passa a ter
-- LEITURA dos dados do paciente até o vínculo ser revogado (revoked_at).
-- Espelha o padrão de "doctor reads linked patient profiles" em
-- doctor-patient-migration.sql, aplicado às tabelas com coluna user_id.
--
-- Idempotente: pode ser re-executado com segurança.

-- ── biomarkers ───────────────────────────────────────────────────────────────
drop policy if exists "doctor reads linked patient biomarkers" on public.biomarkers;
create policy "doctor reads linked patient biomarkers"
  on public.biomarkers for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = biomarkers.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

-- ── biomarker_history ─────────────────────────────────────────────────────────
drop policy if exists "doctor reads linked patient biomarker history" on public.biomarker_history;
create policy "doctor reads linked patient biomarker history"
  on public.biomarker_history for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = biomarker_history.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

-- ── documents ─────────────────────────────────────────────────────────────────
drop policy if exists "doctor reads linked patient documents" on public.documents;
create policy "doctor reads linked patient documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = documents.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

-- ── medications ───────────────────────────────────────────────────────────────
drop policy if exists "doctor reads linked patient medications" on public.medications;
create policy "doctor reads linked patient medications"
  on public.medications for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = medications.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

-- ── family_history ────────────────────────────────────────────────────────────
drop policy if exists "doctor reads linked patient family history" on public.family_history;
create policy "doctor reads linked patient family history"
  on public.family_history for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = family_history.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

-- ── timeline_events ───────────────────────────────────────────────────────────
drop policy if exists "doctor reads linked patient timeline events" on public.timeline_events;
create policy "doctor reads linked patient timeline events"
  on public.timeline_events for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = timeline_events.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

-- ── preventive_reminders ──────────────────────────────────────────────────────
drop policy if exists "doctor reads linked patient reminders" on public.preventive_reminders;
create policy "doctor reads linked patient reminders"
  on public.preventive_reminders for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = preventive_reminders.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

-- ── health_scores ─────────────────────────────────────────────────────────────
drop policy if exists "doctor reads linked patient health score" on public.health_scores;
create policy "doctor reads linked patient health score"
  on public.health_scores for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = health_scores.user_id
        and doctor_patient_links.revoked_at is null
    )
  );
