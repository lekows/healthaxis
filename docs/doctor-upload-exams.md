# Upload de exames pelo medico

## Objetivo

Permitir que o medico envie manualmente exames laboratoriais para um paciente ja
vinculado, quando o paciente ainda nao subiu o arquivo por conta propria.

## Primeiro corte

Escopo inicial:
- Apenas pacientes com vinculo ativo em `doctor_patient_links`.
- Upload manual pelo painel individual em `/doctor/patient/[id]`.
- Arquivo PDF/imagem ou texto colado.
- OCR reaproveitando `app/api/extract-exam/route.ts`.
- Documento salvo em `documents` com `source = 'doctor_upload'`.
- Biomarcadores salvos em `biomarkers` e `biomarker_history` para aparecerem na visao do paciente.
- Status do documento como `patient_review_status = 'pending_patient_review'`.

Fora do escopo inicial:
- Paciente sem login.
- Agente local lendo pastas automaticamente.
- Importacao sem revisao do medico.
- Diagnostico, prescricao ou priorizacao clinica automatica.

## Regras de seguranca

- O medico so pode subir exame para paciente com vinculo ativo e nao revogado.
- O arquivo deve ficar na pasta Storage do paciente, nao na pasta do medico.
- A mudanca deve preservar auditoria de origem:
  - `documents.uploaded_by_doctor_id`
  - `documents.source`
  - `documents.patient_review_status`
  - `biomarkers.last_uploaded_by_doctor_id`
  - `biomarker_history.uploaded_by_doctor_id`
- Qualquer mudanca em RLS, Storage, OCR ou linguagem clinica exige revisao humana.

## Migration

Antes de testar o fluxo, execute:

```sql
-- supabase/doctor-upload-patient-exams.sql
```

## Paciente sem login

Esse fluxo deve ser uma segunda fase. O modelo recomendado e criar um caso
provisorio do medico, gerar link/QR de ativacao e migrar os dados para a conta
real apenas quando o paciente criar login e aceitar importar os exames.

Nao criar usuario fantasma no Supabase Auth automaticamente.

## Agente futuro

O agente local deve comecar como triagem:

1. Lê arquivos de uma pasta local configurada.
2. Roda OCR.
3. Sugere paciente correspondente.
4. Deixa pendente para revisao do medico.
5. Publica somente apos confirmacao humana.
