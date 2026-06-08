# QA Manual — Fluxo Médico ↔ Paciente

> Roteiro de testes manuais para validar o fluxo completo. Pode ser executado por
> qualquer pessoa com duas contas de teste.

## Objetivo

Validar, fim a fim, o vínculo médico-paciente: setup, convite, consentimento, painel,
marcadores monitorados, exibição no perfil do paciente e revogação.

## Pré-requisitos

- App rodando (`npm run dev`, normalmente `http://localhost:3002`).
- Migrations Supabase aplicadas (incluindo `doctor-patient-migration.sql`,
  `doctor-read-linked-patient-data.sql` e `doctor-watched-biomarkers.sql`).
- **Duas contas distintas** (ponto crítico — não testar com a mesma conta):
  - **Conta MÉDICO** — vira `role = 'doctor'` no setup.
  - **Conta PACIENTE** — mantém `role = 'patient'` e tem alguns biomarcadores/exames.
- Dica para isolar sessões: usar duas janelas/perfis do navegador (ex.: uma normal e uma anônima).

## Atores

- **Tester-Médico** — opera a conta MÉDICO.
- **Tester-Paciente** — opera a conta PACIENTE.

## Cenários

### C1 — Setup do médico
- **Pré:** logado na conta MÉDICO (ainda como paciente).
- **Passos:** acessar `/doctor` → ser redirecionado a `/doctor/setup` → preencher CRM + UF
  (especialidade/bio opcionais) → salvar.
- **Esperado:** redirecionado a `/doctor`; cabeçalho mostra "CRM {crm}/{uf} · {especialidade}".

### C2 — Geração do convite (QR)
- **Pré:** C1 concluído.
- **Passos:** na seção "Convite para paciente", gerar/visualizar o QR.
- **Esperado:** QR + link `${baseUrl}/connect/{token}`; rótulo "Válido até {data ~30 dias}".

### C3 — Validações negativas do convite
- **C3.1 Auto-vínculo:** abrir o link do convite **logado como o próprio MÉDICO** e aceitar.
  - **Esperado:** erro (400) — "Médico não pode aceitar o próprio convite".
- **C3.2 Token inválido:** abrir `/connect/um-token-qualquer-invalido`.
  - **Esperado:** tela "Convite inválido ou expirado".

### C4 — Aceite pelo paciente (consentimento)
- **Pré:** abrir o link do convite na conta PACIENTE.
- **Passos:** conferir nome/CRM do médico → clicar "Aceitar e vincular".
  - Se cair na tela de login, autenticar e retornar ao convite.
- **Esperado:** "Vínculo criado com sucesso!" e redirecionamento a `/profile` em ~2 s.
- **Verificação no banco (opcional):** `doctor_patient_links` tem linha com `consent_at`
  preenchido e `revoked_at = null`; `doctor_invites.used_at`/`used_by` preenchidos.

### C5 — Reutilização do token
- **Passos:** com o token já usado em C4, tentar abrir/aceitar novamente.
- **Esperado:** tela "Convite inválido ou expirado" (token consumido via `used_at`).

### C6 — Painel do médico
- **Pré:** logado como MÉDICO; vínculo de C4 ativo.
- **Passos:** `/doctor` → ver o paciente na lista → abrir `/doctor/patient/[id]`.
- **Esperado:** nome/idade/sexo do paciente; biomarcadores agrupados (fora do intervalo,
  atenção, dentro do intervalo); últimos exames. O nome real do paciente aparece (não "Paciente").

### C7 — Monitorar biomarcadores (toggle do médico)
- **Pré:** C6 aberto.
- **Passos:** clicar no ícone de olho em 2–3 cards de biomarcador.
- **Esperado:** ícone fica destacado (verde) nos selecionados; chamada
  `POST /api/doctor/watched` retorna 200. Recarregar a página mantém a seleção.

### C8 — Chips no perfil do paciente
- **Pré:** C7 feito; logar na conta PACIENTE (sessão separada).
- **Passos:** abrir `/profile` → seção "Médicos vinculados".
- **Esperado:** o médico aparece com CRM/especialidade e a linha "Acompanhando:"
  com chips dos marcadores escolhidos em C7.
- **Atenção:** este passo só funciona logado **como o paciente**. Visto pela conta do
  médico, `/profile` mostra o perfil do médico, sem a seção de médicos vinculados.

### C9 — Revogação pelo paciente
- **Pré:** logado como PACIENTE; vínculo ativo.
- **Passos:** `/profile` → "Médicos vinculados" → "Revogar".
- **Esperado:** o médico some da lista; `doctor_patient_links.revoked_at` é preenchido.

### C10 — Perda de acesso do médico
- **Pré:** C9 feito; voltar à conta MÉDICO.
- **Passos:** tentar abrir `/doctor/patient/[id]` do paciente revogado.
- **Esperado:** página `notFound()` (404) — o guard `getLinkedPatientPanel` retorna `null`.
  O paciente também some da lista em `/doctor`.

## Critérios de aceite (resumo)

- [ ] C1–C10 passam conforme o esperado.
- [ ] Auto-vínculo bloqueado.
- [ ] Token de uso único e com expiração.
- [ ] Consentimento (`consent_at`) registrado.
- [ ] Revogação corta o acesso imediatamente, sem apagar dados do paciente.

## Observações de teste

- **Sessões separadas são obrigatórias:** logar médico e paciente em janelas/perfis
  diferentes. Testar com uma única conta confunde os papéis e mascara o comportamento real.
- Para inspeção rápida no banco, usar o SQL Editor do Supabase (as policies RLS impedem
  leitura via chave anônima fora do contexto do usuário).
