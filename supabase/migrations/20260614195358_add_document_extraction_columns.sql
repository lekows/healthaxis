-- Adiciona as colunas que sustentam o pipeline de extração de documentos (OCR via Claude Haiku).
--
-- A rota app/api/extract-exam/route.ts grava o andamento da extração nestas colunas em cada
-- etapa (download, envio ao modelo, interpretação, conclusão) e o DocumentUploadModal faz polling
-- de extraction_progress/extraction_message para exibir a barra de progresso ao usuário.
--
-- Idempotente: usa "add column if not exists", então pode ser reaplicada com segurança e não
-- altera colunas/dados já existentes em bancos que já as possuem.

-- Estado da extração: pending | processing | processed | error.
-- Distinta de documents.status (reviewed | pending | processing), que reflete a curadoria do laudo.
alter table public.documents add column if not exists extraction_status text default 'pending';

-- Progresso da extração de 0 a 100, consumido pela barra de progresso no upload.
alter table public.documents add column if not exists extraction_progress integer default 0;

-- Mensagem amigável da etapa atual (ex.: "Identificando biomarcadores…").
alter table public.documents add column if not exists extraction_message text;

-- Detalhe do erro quando a extração falha (extraction_status = 'error').
alter table public.documents add column if not exists extraction_error text;

-- Momento de conclusão da extração; preenchido apenas quando extraction_status = 'processed'.
alter table public.documents add column if not exists extracted_at timestamptz;

comment on column public.documents.extraction_status   is 'Pipeline de extração de documentos: pending | processing | processed | error.';
comment on column public.documents.extraction_progress is 'Pipeline de extração de documentos: progresso 0–100 exibido na barra de upload.';
comment on column public.documents.extraction_message  is 'Pipeline de extração de documentos: mensagem da etapa atual mostrada ao usuário.';
comment on column public.documents.extraction_error    is 'Pipeline de extração de documentos: detalhe do erro quando a extração falha.';
comment on column public.documents.extracted_at        is 'Pipeline de extração de documentos: timestamp de conclusão (extraction_status = processed).';
