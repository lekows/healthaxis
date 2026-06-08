# Fluxo Médico ↔ Paciente — HealthAxis

> Documentação técnica e funcional do ciclo de vida do vínculo médico-paciente.
> Baseada no código em produção. Caminhos e cláusulas citados são verbatim do repositório.

## Objetivo

Descrever, de ponta a ponta, como um médico passa a ter acesso de **leitura** aos
dados clínicos de um paciente no HealthAxis — desde o cadastro do médico até a
revogação do vínculo pelo paciente. O acesso é sempre **consentido, rastreável e
revogável**, conforme a LGPD.

## Atores

| Ator | Papel | Identificação |
|---|---|---|
| **Médico** | Gera convites, vê o painel dos pacientes vinculados | `profiles.role = 'doctor'` + linha em `doctor_profiles` |
| **Paciente** | Aceita o convite, controla o vínculo, revoga | `profiles.role = 'patient'` (default) |
| **Supabase RLS** | Aplica autorização no banco em toda leitura/escrita | Políticas por tabela (ver `security-lgpd-checklist.md`) |

## Visão geral do fluxo

```
[1] Médico faz setup       /doctor/setup  → profiles.role='doctor' + doctor_profiles
        │
[2] Médico gera convite    POST /api/doctor/invite → doctor_invites (token, expires_at)
        │
[3] QR/link entregue        ${baseUrl}/connect/${token}
        │
[4] Paciente abre o link    /connect/[token] → resolve_doctor_invite (RPC)
        │
[5] Paciente consente       POST /api/doctor/connect → doctor_patient_links (consent_at)
        │
[6] Vínculo ativo           médico lê dados via RLS (revoked_at is null)
        │
[7] Médico abre painel      /doctor/patient/[id] → getLinkedPatientPanel (guard)
        │
[8] Paciente revoga         POST /api/doctor/revoke → revoked_at = now()  → acesso cessa
```

## Fluxo passo a passo

### 1. Setup do médico
- Rota: `app/doctor/setup/page.tsx` (form em `components/doctor/DoctorSetupForm.tsx`).
- Endpoint: `POST /api/doctor/setup` (`app/api/doctor/setup/route.ts`).
- Efeitos:
  - `profiles.role` é atualizado para `'doctor'`.
  - `doctor_profiles` recebe upsert com `crm`, `crm_uf` (uppercase), `specialty`, `bio`.
- Campos obrigatórios: **CRM** e **UF**. Sem eles → `400 "CRM e UF são obrigatórios"`.
- **Observação:** a mudança de papel é unidirecional — não há downgrade de `doctor` → `patient` no código atual.

### 2. Geração do convite (QR)
- Endpoint: `POST /api/doctor/invite` (`app/api/doctor/invite/route.ts`).
- Só médicos: se `profile.role !== "doctor"` → `403 "Apenas médicos podem gerar convites"`.
- Cria registro em `doctor_invites`; `token` e `expires_at` vêm de defaults do banco
  (`gen_random_uuid()::text` e `now() + interval '30 days'`).
- Retorna `{ id, token, expires_at }`.
- `DELETE /api/doctor/invite` remove o convite, restrito a `doctor_id = auth.uid()`.

Detalhes do QR/consentimento em **`qr-code-consent-flow.md`**.

### 3–5. Entrega, aceite e consentimento
- O QR codifica `${baseUrl}/connect/${token}` (`components/doctor/DoctorInviteQR.tsx`, linha 18).
- `app/connect/[token]/page.tsx` resolve o convite via RPC `resolve_doctor_invite` e
  mostra nome/CRM/especialidade do médico.
- `components/doctor/ConnectAcceptClient.tsx` chama `POST /api/doctor/connect`.
- `app/api/doctor/connect/route.ts`:
  - Faz upsert em `doctor_patient_links` com `consent_at = now()` e `revoked_at = null`
    (`onConflict: "doctor_id,patient_id"`).
  - Marca o convite como usado (`used_at`, `used_by`).
  - Bloqueia auto-vínculo: `doctorId === user.id` → `400`.

### 6. Vínculo ativo — leitura do médico
- A partir do vínculo (`revoked_at is null`), o médico tem **SELECT** nas tabelas do paciente
  via políticas em `supabase/doctor-read-linked-patient-data.sql`:
  `biomarkers`, `biomarker_history`, `documents`, `medications`, `family_history`,
  `timeline_events`, `preventive_reminders`, `health_scores`.
- O nome do paciente vem de `profiles` via a política `"doctor reads linked patient profiles"`.

### 7. Painel do médico
- Lista de pacientes: `app/doctor/page.tsx` + `components/doctor/DoctorDashboardClient.tsx`
  (usa `getLinkedPatients()`).
- Painel individual: `app/doctor/patient/[id]/page.tsx`, dados via
  `getLinkedPatientPanel(patientId)` (`lib/supabase/doctor-queries.ts`).
- **Guard de autorização** (defesa em profundidade, além da RLS):
  ```ts
  const { data: link } = await supabase
    .from("doctor_patient_links")
    .select("id")
    .eq("doctor_id", user.id)
    .eq("patient_id", patientId)
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) return null;   // página chama notFound()
  ```
- O painel mostra: nome/idade/sexo, biomarcadores ordenados por severidade
  (fora do intervalo → atenção → dentro do intervalo por categoria) e os últimos 5 exames.

### 8. Revogação
- Endpoint: `POST /api/doctor/revoke` (`app/api/doctor/revoke/route.ts`).
- UI: `components/patient/LinkedDoctorSection.tsx` (botão "Revogar" no perfil do paciente).
- Efeito: `doctor_patient_links.revoked_at = now()`, `revoked_by = user.id`.
- Restrição: o update só atinge linhas com `patient_id = auth.uid()` → **somente o paciente revoga**.
- Após revogar, todas as RLS de leitura do médico falham (`revoked_at is null` deixa de valer).
- **Os dados do paciente não são apagados** — apenas o acesso é cortado.

## Regras de acesso (resumo)

| Ação | Quem pode | Mecanismo |
|---|---|---|
| Gerar/excluir convite | Médico dono | role check + RLS `doctor manages own invites` |
| Resolver convite (ver médico) | Qualquer um (anon) | RPC SECURITY DEFINER `resolve_doctor_invite` |
| Criar vínculo (aceitar) | Paciente autenticado | RLS `patient accepts invite` (`auth.uid() = patient_id`) |
| Ler dados do paciente | Médico vinculado ativo | RLS `doctor reads linked patient *` (`revoked_at is null`) |
| Revogar vínculo | Somente paciente | RLS `patient revokes own links` |

## Status HTTP por endpoint

| Endpoint | 200 | 400 | 401 | 403 | 404 | 500 |
|---|---|---|---|---|---|---|
| `POST /api/doctor/setup` | ok | CRM/UF ausente | não autenticado | — | — | erro DB |
| `POST /api/doctor/invite` | `{id,token,expires_at}` | — | não autenticado | não é médico | — | erro DB |
| `DELETE /api/doctor/invite` | `{ok:true}` | — | não autenticado | — | — | — |
| `POST /api/doctor/connect` | `{ok,doctor_id}` | token ausente / auto-vínculo | não autenticado | — | convite inválido/expirado | erro DB |
| `POST /api/doctor/revoke` | `{ok:true}` | linkId ausente | não autenticado | — | — | erro DB |

## Riscos

- **Token em URL:** o link de convite concede a qualquer pessoa a tela de aceite.
  Mitigado por: expiração (30 dias), uso único (`used_at`) e exigência de login para criar o vínculo.
- **Exposição mínima na RPC:** `resolve_doctor_invite` roda como SECURITY DEFINER e
  expõe nome/CRM/especialidade do médico a usuários anônimos. É intencional (tela de aceite),
  mas é dado pessoal do médico — manter o conjunto retornado mínimo.
- **Papel unidirecional:** não há downgrade `doctor → patient`.
- **Revogação não apaga dados:** corta acesso, mas o histórico permanece no paciente (esperado).

## Critérios de aceite

- [ ] Médico sem `doctor_profiles` é redirecionado para `/doctor/setup`.
- [ ] Convite gerado aparece como QR + link; expira em 30 dias.
- [ ] Paciente autenticado consegue aceitar; `consent_at` é gravado.
- [ ] Médico não consegue aceitar o próprio convite (400).
- [ ] Convite expirado/já usado mostra "Convite inválido ou expirado".
- [ ] Médico vê o painel apenas de pacientes com vínculo ativo.
- [ ] Após revogação, o painel do paciente retorna `notFound()` para o médico.

## Checklist de QA

Roteiro manual detalhado em **`manual-qa-doctor-patient.md`**.
