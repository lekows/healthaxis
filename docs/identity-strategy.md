# Estratégia de identidade confiável (HealthAxis)

> Status: **planejamento**. CPF **não será implementado agora** (dificulta os testes).
> Toda mudança daqui para frente deve ser feita já deixando espaço para CPF/CRM verificado.

## Problema

Hoje a identidade do usuário é estabelecida apenas por:
- `auth.uid()` (UUID gerado pelo Supabase Auth) — chave primária de `profiles`.
- email — armazenado em `auth.users` (não em `profiles`), confirmado por verificação de email.

Consequências:
- Uma pessoa com **dois emails** vira **dois usuários distintos**, sem forma de o sistema saber que são a mesma pessoa.
- **CRM** do médico é texto autodeclarado (`doctor_profiles.crm`), sem validação.
- `doctor_profiles.verified_at` existe no schema mas **nunca é preenchido**.

## Direção (faseado)

### Fase 1 — Verificação de CRM (sem CPF)
- Preencher `doctor_profiles.verified_at` manualmente pela equipe (revisão do CRM informado).
- Exibir **selo "Verificado"** onde o médico aparece:
  - tela de aceite do convite — `app/connect/[token]/page.tsx`
  - médicos vinculados do paciente — `components/patient/LinkedDoctorSection.tsx`
- Mais tarde: validar `crm`/`crm_uf` contra registro do CFM/CRM via API e setar `verified_at` automaticamente.

### Fase 2 — CPF como âncora de identidade do paciente (adiado)
- Adicionar `profiles.cpf` (text, **único**), com:
  - validação dos dígitos verificadores no app (na coleta em `app/auth/setup`);
  - constraint de unicidade no banco;
  - máscara/hashing na exibição (CPF é dado sensível — LGPD).
- Fluxo de migração para usuários existentes sem CPF (coleta no próximo login).

### Fase 3 — Vínculo reforçado por CPF/CRM (opcional)
- No aceite do convite, casar paciente/médico também por CPF/CRM além do token,
  reduzindo o risco de vínculo ao usuário errado.

## Princípios de projeto (aplicar desde já)

1. **Não acoplar lógica de negócio ao email.** Continuar usando `auth.uid()` como chave de identidade em queries, RLS e vínculos.
2. Manter o **painel do médico** e o **fluxo de vínculo** prontos para receber um identificador forte
   (CPF/CRM verificado) sem refatoração estrutural.
3. Tratar qualquer novo dado identificador como **sensível** (LGPD): minimizar exposição, mascarar na UI.
