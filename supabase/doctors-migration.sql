-- Tabela de médicos do paciente (extraídos dos exames via OCR)
create table if not exists doctors (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  name           text not null,
  crm            text not null,
  crm_uf         text not null default '',
  specialty      text,
  first_exam_date date,
  last_exam_date  date,
  exam_count     int default 1,
  created_at     timestamptz default now(),
  unique(user_id, crm, crm_uf)
);

alter table doctors enable row level security;

create policy "user sees own doctors"
  on doctors for all
  using (auth.uid() = user_id);

-- Colunas extras na tabela documents (metadados do médico e lab extraídos pelo OCR)
alter table documents add column if not exists doctor_name  text;
alter table documents add column if not exists doctor_crm   text;
alter table documents add column if not exists doctor_crm_uf text;
alter table documents add column if not exists lab_name     text;
