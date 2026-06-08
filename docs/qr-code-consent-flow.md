# QR Code & Consentimento — HealthAxis

> Detalha a geração do QR de convite, a tela de aceite e o registro de consentimento (LGPD).
> Complementa `doctor-patient-flow.md`.

## Objetivo

Garantir que o vínculo médico-paciente só seja criado após **consentimento explícito**
do paciente, com **data e hora registradas**, partindo de um convite gerado pelo médico
e entregue como QR Code ou link.

## Atores

- **Médico** — gera o convite e exibe/compartilha o QR.
- **Paciente** — escaneia/abre o link, revê quem é o médico e aceita.
- **RPC `resolve_doctor_invite`** — resolve o token com segurança, mesmo para usuário anônimo.

## Fluxo passo a passo

### 1. Geração do convite
- `POST /api/doctor/invite` insere em `doctor_invites` com `doctor_id = auth.uid()`.
- Defaults do banco (`supabase/doctor-patient-migration.sql`):
  ```sql
  token       text unique not null default gen_random_uuid()::text,
  expires_at  timestamptz not null default now() + interval '30 days',
  ```
- Resposta: `{ id, token, expires_at }`.

### 2. Exibição do QR
- `components/doctor/DoctorInviteQR.tsx` monta a URL:
  ```ts
  const url = `${baseUrl}/connect/${token}`;
  ```
- Renderiza `<QRCode value={url} size={180} />` e um link copiável.
- Mostra "Válido até {data}" e o aviso:
  *"O vínculo só é criado após o paciente aceitar explicitamente."*
- Botões: gerar novo convite (`onGenerate`) e revogar convite (`onRevoke` → `DELETE /api/doctor/invite`).

### 3. Abertura do link pelo paciente
- Rota: `app/connect/[token]/page.tsx` (server component).
- Resolve o convite:
  ```ts
  const { data: doctorInfo } = await supabase
    .rpc("resolve_doctor_invite", { p_token: token })
    .single();
  ```
- Se nulo (token inválido/expirado/usado) → tela **"Convite inválido ou expirado"**.
- Se válido → card com `doctor_name`, `CRM {crm}/{crm_uf}` e especialidade, mais a lista de consentimento:
  - "Este médico poderá ver que você é paciente dele no HealthAxis"
  - "Você controla quais exames compartilhar — nada é automático"
  - "Você pode desfazer este vínculo a qualquer momento"
- Rodapé: *"Ao aceitar, seu consentimento é registrado com data e hora (LGPD Art. 7º, I)."*

### 4. Aceite e consentimento
- `components/doctor/ConnectAcceptClient.tsx`:
  - `POST /api/doctor/connect` com `{ token }`.
  - Se `401` → redireciona para `/auth/login?redirect=/connect/${token}` (volta ao convite após login).
  - Em sucesso → "Vínculo criado com sucesso!" e redireciona para `/profile` em ~2 s.
  - Em erro → exibe `data.error`.
- `app/api/doctor/connect/route.ts`:
  - Resolve o convite de novo (server-side) via `resolve_doctor_invite`.
  - Bloqueia auto-vínculo (`doctorId === user.id` → 400).
  - Upsert do vínculo com **consentimento**:
    ```ts
    { doctor_id, patient_id, consent_at: new Date().toISOString(), revoked_at: null }
    ```
  - Marca o convite como usado: `used_at`, `used_by`.

## A RPC `resolve_doctor_invite`

```sql
create or replace function public.resolve_doctor_invite(p_token text)
returns table (doctor_id uuid, doctor_name text, crm text, crm_uf text, specialty text)
language sql security definer as $$
  select profiles.id, profiles.name, doctor_profiles.crm, doctor_profiles.crm_uf, doctor_profiles.specialty
  from public.doctor_invites
  join public.profiles        on profiles.id        = doctor_invites.doctor_id
  join public.doctor_profiles on doctor_profiles.id = doctor_invites.doctor_id
  where doctor_invites.token = p_token
    and doctor_invites.expires_at > now()
    and doctor_invites.used_at is null;
$$;

grant execute on function public.resolve_doctor_invite(text) to anon, authenticated;
```

- **SECURITY DEFINER:** roda como dono da função, contornando RLS — necessário porque o
  paciente (possivelmente anônimo) precisa ver o médico antes de logar.
- **Filtros de validade embutidos:** `expires_at > now()` e `used_at is null`.
  Token expirado ou já usado retorna conjunto vazio → tela de convite inválido.

## Regras de acesso

| Item | Regra |
|---|---|
| Gerar convite | Apenas `role = 'doctor'` |
| Resolver convite | `anon` e `authenticated` (via RPC) |
| Criar vínculo | Paciente autenticado (`POST /api/doctor/connect`) |
| Reutilização | Bloqueada — `used_at` invalida o token |
| Expiração | 30 dias (default do banco) |

## Riscos

- **Link compartilhável demais:** quem tiver o link vê o médico e pode aceitar (se logado
  com outra conta). Uso único + expiração reduzem a janela.
- **Phishing reverso:** o paciente deve conferir nome/CRM antes de aceitar — a tela exibe isso.
- **Dados do médico expostos a anônimo:** apenas nome, CRM e especialidade (mínimo necessário).

## Critérios de aceite

- [ ] QR e link apontam para `${baseUrl}/connect/${token}`.
- [ ] Tela de aceite mostra nome, CRM/UF e especialidade do médico.
- [ ] `consent_at` é gravado no momento do aceite.
- [ ] Token expirado ou usado leva à tela "Convite inválido ou expirado".
- [ ] Aceite sem login redireciona ao login e retorna ao convite.
- [ ] Gerar novo convite e revogar convite funcionam pelo painel.

## Checklist de QA

- [ ] Escanear o QR em um dispositivo abre a tela de aceite correta.
- [ ] Copiar o link e abrir manualmente leva ao mesmo destino.
- [ ] Aceitar duas vezes o mesmo token: a segunda falha (token usado).
- [ ] Verificar no banco que `consent_at` e `used_at` foram preenchidos.
- [ ] Conferir o texto LGPD no rodapé da tela de convite.
