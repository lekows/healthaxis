# HealthAxis — configuração de login no Supabase

Este documento descreve a configuração necessária no Supabase para suportar o fluxo de autenticação implementado no app.

## Projeto Supabase

- Project ref: `uwaknvlaarbnidjsvtec`
- Auth/API URL: `https://uwaknvlaarbnidjsvtec.supabase.co`
- Callback do Supabase para provedores OAuth: `https://uwaknvlaarbnidjsvtec.supabase.co/auth/v1/callback`

## Métodos suportados no app

A implementação atual do HealthAxis expõe estes caminhos de entrada:

1. Google OAuth
2. Microsoft/Azure OAuth
3. E-mail + senha
4. E-mail sem senha via Magic Link

O Magic Link usa `supabase.auth.signInWithOtp()` com `shouldCreateUser: true`. Portanto, o mesmo botão funciona para login e criação de usuário quando o e-mail ainda não existe.

## Redirect URLs do Supabase Auth

No Supabase Dashboard, configurar em:

`Authentication → URL Configuration`

Adicionar pelo menos:

```txt
http://localhost:3002/auth/callback
https://<dominio-producao>/auth/callback
https://<dominio-preview-vercel>/auth/callback
```

O projeto usa `next dev -p 3002`, por isso o callback local deve apontar para a porta `3002`.

## Email / Magic Link

No Supabase Dashboard:

`Authentication → Providers → Email`

Manter habilitado:

- Email provider
- Confirm email, se o fluxo exigir confirmação antes da sessão
- Magic Link template

A implementação atual usa link mágico. Se no futuro o produto quiser código de 6 dígitos digitado dentro do app, será necessário trocar o template para mostrar `{{ .Token }}` e adicionar uma tela/rota com `supabase.auth.verifyOtp()`.

## Google OAuth

No Supabase Dashboard:

`Authentication → Providers → Google`

Configurar:

- Client ID
- Client Secret
- Redirect/callback permitido no Google Cloud: `https://uwaknvlaarbnidjsvtec.supabase.co/auth/v1/callback`

## Microsoft / Azure OAuth

No Supabase Dashboard:

`Authentication → Providers → Azure`

Configurar:

- Azure provider habilitado
- Client ID
- Client Secret
- Azure Tenant URL, se quiser restringir a uma instituição/tenant específico

No Microsoft Entra ID, registrar o app OAuth com o redirect URI:

```txt
https://uwaknvlaarbnidjsvtec.supabase.co/auth/v1/callback
```

O client app envia `scopes: "email"` para o provider `azure`, porque o Supabase Auth precisa receber um e-mail válido do Microsoft Entra.

Recomendação de segurança: configurar no app do Microsoft Entra os optional claims `email` e `xms_edov` para reduzir risco com domínios de e-mail não verificados.

## Fluxo esperado

### Usuário existente

1. Entra com Google, Microsoft, senha ou Magic Link.
2. `/auth/callback` troca o código por sessão.
3. `/auth/post-login` decide o destino:
   - admin clínico → `/doctor/admin`
   - médico → `/doctor`
   - paciente → `/dashboard`

### Usuário novo por OAuth ou Magic Link

1. Usuário autentica por Google, Microsoft ou link mágico.
2. `/auth/callback` identifica criação recente.
3. Redireciona para `/auth/setup`.
4. Usuário confirma nome, tipo de conta e CRM se for médico.
5. `updateUserRole()` grava papel e cria/atualiza perfil médico quando necessário.

## Observação LGPD

Não colocar CRM, CPF, telefone, papel clínico ou dados sensíveis em lógica de autorização baseada apenas em `user_metadata`, porque esse campo pode ser exposto no JWT e não deve ser a fonte final de permissão.

A autorização deve continuar baseada nas tabelas do banco, em especial `profiles`, `doctor_profiles`, vínculos médico-paciente e políticas RLS.
