-- Upload manual de exames pelo medico para paciente vinculado.
-- Execute no Supabase SQL Editor antes de usar o botao "Subir exame" no painel medico.
--
-- Modelo:
-- - O medico so pode inserir/atualizar dados de pacientes com vinculo ativo.
-- - O arquivo fica na pasta Storage do paciente, para o paciente manter controle futuro.
-- - O documento fica marcado como doctor_upload e pending_patient_review.

alter table public.documents
  add column if not exists uploaded_by_doctor_id uuid references public.profiles(id) on delete set null,
  add column if not exists source text default 'patient_upload',
  add column if not exists patient_review_status text default 'accepted';

alter table public.biomarkers
  add column if not exists last_uploaded_by_doctor_id uuid references public.profiles(id) on delete set null,
  add column if not exists last_source_document_id uuid references public.documents(id) on delete set null;

alter table public.biomarker_history
  add column if not exists uploaded_by_doctor_id uuid references public.profiles(id) on delete set null,
  add column if not exists source_document_id uuid references public.documents(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_source_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_source_check
      check (source in ('patient_upload', 'doctor_upload'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_patient_review_status_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_patient_review_status_check
      check (patient_review_status in ('accepted', 'pending_patient_review', 'hidden'));
  end if;
end $$;

drop policy if exists "linked doctors insert patient documents" on public.documents;
create policy "linked doctors insert patient documents"
  on public.documents for insert
  to authenticated
  with check (
    uploaded_by_doctor_id = (select auth.uid())
    and source = 'doctor_upload'
    and patient_review_status = 'pending_patient_review'
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id = documents.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

drop policy if exists "linked doctors update own uploaded patient documents" on public.documents;
create policy "linked doctors update own uploaded patient documents"
  on public.documents for update
  to authenticated
  using (
    uploaded_by_doctor_id = (select auth.uid())
    and source = 'doctor_upload'
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id = documents.user_id
        and doctor_patient_links.revoked_at is null
    )
  )
  with check (
    uploaded_by_doctor_id = (select auth.uid())
    and source = 'doctor_upload'
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id = documents.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

drop policy if exists "linked doctors delete own uploaded patient documents" on public.documents;
create policy "linked doctors delete own uploaded patient documents"
  on public.documents for delete
  to authenticated
  using (
    uploaded_by_doctor_id = (select auth.uid())
    and source = 'doctor_upload'
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id = documents.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

drop policy if exists "linked doctors insert patient biomarkers" on public.biomarkers;
create policy "linked doctors insert patient biomarkers"
  on public.biomarkers for insert
  to authenticated
  with check (
    last_uploaded_by_doctor_id = (select auth.uid())
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id = biomarkers.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

drop policy if exists "linked doctors update patient biomarkers they uploaded" on public.biomarkers;
create policy "linked doctors update patient biomarkers they uploaded"
  on public.biomarkers for update
  to authenticated
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id = biomarkers.user_id
        and doctor_patient_links.revoked_at is null
    )
  )
  with check (
    last_uploaded_by_doctor_id = (select auth.uid())
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id = biomarkers.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

drop policy if exists "linked doctors insert patient biomarker history" on public.biomarker_history;
create policy "linked doctors insert patient biomarker history"
  on public.biomarker_history for insert
  to authenticated
  with check (
    uploaded_by_doctor_id = (select auth.uid())
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id = biomarker_history.user_id
        and doctor_patient_links.revoked_at is null
    )
  );

drop policy if exists "linked doctors upload exam files to patient folder" on storage.objects;
create policy "linked doctors upload exam files to patient folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'exam-files'
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id::text = (storage.foldername(name))[1]
        and doctor_patient_links.revoked_at is null
    )
  );

drop policy if exists "linked doctors read patient exam files" on storage.objects;
create policy "linked doctors read patient exam files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'exam-files'
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id::text = (storage.foldername(name))[1]
        and doctor_patient_links.revoked_at is null
    )
  );

drop policy if exists "linked doctors remove own failed patient uploads" on storage.objects;
create policy "linked doctors remove own failed patient uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'exam-files'
    and exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = (select auth.uid())
        and doctor_patient_links.patient_id::text = (storage.foldername(name))[1]
        and doctor_patient_links.revoked_at is null
    )
  );
