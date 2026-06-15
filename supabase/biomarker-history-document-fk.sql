alter table biomarker_history
  add column if not exists document_id uuid references documents(id) on delete set null;

create index if not exists idx_biomarker_history_document_id
  on biomarker_history(document_id) where document_id is not null;
