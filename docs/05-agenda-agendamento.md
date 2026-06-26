# 05 — Agenda / Agendamento de consultas (MVP interno)

> Épico **#64**. Esta entrega cobre o **MVP mínimo útil** definido pelo dono no
> próprio épico: **#65 (modelo de dados) + #66 (serviços/API) + #67 (cockpit)**,
> com a adição de **solicitação pelo paciente**. Itens pós-MVP ficam adiados (ver
> "Fora deste escopo").

## Objetivo

Dar ao HealthAxis uma **agenda clínica interna como fonte canônica**: o médico cria
e gerencia consultas dos pacientes vinculados; o paciente pode **solicitar** consulta
a um médico com vínculo ativo. Humano sempre no comando — toda escrita parte de um
usuário autenticado e é auditada.

## Modelo de dados

Migração: `supabase/migrations/20260626000000_appointments.sql`. Reutiliza
`profiles` + `doctor_patient_links` + `public.has_active_link(doctor, patient)`
(criado em `20260624000000_care_plans.sql`). **Não** cria entidade de
clínica/organização nem tabelas de calendário externo.

- **`appointments`** — consulta canônica. `doctor_id`/`patient_id`/`created_by` →
  `profiles`. `source` (`manual`/`patient_request`/`system`), `status` (ver abaixo),
  `starts_at`/`ends_at`/`timezone`, `appointment_type`, `reason` (operacional, sem
  dado clínico sensível), `cancellation_*`, `rescheduled_from_appointment_id`
  (preserva histórico). `check (ends_at > starts_at)`, trigger `updated_at`.
- **`appointment_events`** — auditoria (quem, quando, ação, metadata). Escrita só via
  service role (sem policy de INSERT), leitura por participante da consulta.

### Lifecycle de status

`requested` → `pending_confirmation` → `scheduled` → `confirmed` → `arrived` →
`completed`. Terminais: `cancelled`, `no_show`, `rescheduled`.

- **Bloqueiam horário** (geram conflito): `scheduled`, `confirmed`, `arrived`.
  `requested`/`pending_confirmation` ainda não são compromisso firme; terminais
  liberam o horário.
- **`no_show`** só pode ser marcado **após** o horário de início.
- **Remarcação** nunca apaga: a original vira `rescheduled` e uma nova consulta é
  criada com `rescheduled_from_appointment_id`.

## RLS

- Médico dono com vínculo ativo gerencia (`for all`): `doctor_id = auth.uid() and
  has_active_link(doctor_id, patient_id)`.
- Paciente lê as próprias (`patient_id = auth.uid()`) e **solicita** (`insert` só com
  `status = 'requested'`, `source = 'patient_request'`, para si, a médico vinculado).
- `appointment_events`: leitura por participante; escrita só service role.

Garante sem vazamento entre médicos/pacientes: a RLS espelha o padrão já usado em
`care_plans` e `doctor-read-linked-patient-data.sql`.

## Camadas de código

- **Lógica pura** (`lib/appointments/`): `conflicts.ts` (`overlaps`, `findConflicts`)
  e `status.ts` (`BLOCKING_STATUSES`, `canMarkNoShow`, labels e cores). Testada em
  `lib/__tests__/appointment-conflicts.test.ts`.
- **Dados** (`lib/supabase/appointment-queries.ts`): `getDoctorAppointments`,
  `getMyAppointments` (nomes resolvidos em query separada, evitando embedded join).
- **Mutations** (`lib/supabase/appointment-mutations.ts`, server actions):
  `createAppointment` (médico), `requestAppointment` (paciente),
  `updateAppointmentStatus`, `rescheduleAppointment`. Conflito checado antes de
  gravar; auditoria fire-and-forget via service role.
- **UI médico**: `/doctor/agenda` (`app/doctor/agenda/page.tsx` +
  `components/doctor/DoctorAgendaClient.tsx`) com visões Hoje/Semana/Próximas/Todas,
  ações de status e remarcação; card "Agenda hoje" no cockpit (`app/doctor/page.tsx`).
- **UI paciente**: `/appointments` (`app/appointments/page.tsx` +
  `components/patient/PatientAppointmentsClient.tsx`) — lista + solicitar consulta.
- **Nav**: item "Agenda" (médico) e "Consultas" (paciente) em
  `components/layout/DashboardLayout.tsx`.

## Feature flag / rollout

`lib/feature-flags.ts` → `appointmentsEnabled` (default ON). Para desligar a agenda
sem regressão: `NEXT_PUBLIC_APPOINTMENTS_ENABLED="false"` (esconde nav + redireciona
as páginas).

## Conformidade (regras do projeto)

- **SaMD**: a face do paciente é organizacional (solicitar/visualizar consulta), sem
  conduta clínica. Score/diagnóstico continuam só na face do médico.
- **Auditabilidade**: toda mutação grava em `appointment_events`.
- **Iniciado pelo paciente**: o vínculo médico↔paciente continua a porta de entrada;
  sem vínculo ativo, nada é agendado.

## Fora deste escopo (adiado)

- **#68** Google Calendar (OAuth, sync incremental, webhook).
- **#69** Matching de paciente a partir de eventos externos.
- **#70** Camada de mensagens/WhatsApp.
- **#71** Tela admin de integrações/consentimento.
- **#72** Abstração de providers (Outlook/CalDAV).
- **#73** QA/seeds/rollout completo.

Quando #68/#69 entrarem, `appointments.patient_id` pode ser relaxado para nullable
(eventos externos sem paciente identificado) via nova migração, e as tabelas
`external_calendar_*` / `patient_match_candidates` do #65 serão adicionadas.

## Verificação

`npm run typecheck` · `npm run test` (inclui conflitos) · `npm run check:docs` ·
`npm run build`. Aplicar a migração no Supabase. QA manual: médico cria → aparece em
`/doctor/agenda` e em `/appointments` do paciente; conflito de horário bloqueado;
paciente solicita → `requested` visível ao médico; paciente A não vê consulta de B.
