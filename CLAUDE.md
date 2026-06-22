# HealthAxis — Contexto do Projeto (Claude Code)

> Lido automaticamente a cada sessão. Mantenha curto e estável.
> Especificações detalhadas vivem em `docs/`. Elas são a fonte de verdade.

## O que é o HealthAxis

Plataforma brasileira de saúde preventiva com **duas faces sobre a mesma base de dados**:

- **Face do paciente** (organizador / visualizador / educador): organiza exames
  laboratoriais, acompanha biomarcadores longitudinais e prepara o paciente para a
  consulta. **Nunca substitui o médico e nunca prescreve.**
- **Face do médico** (cockpit cardiometabólico): apoio à decisão clínica com **humano
  sempre no comando**. O médico emite scores, planos e prescrições de hábitos; o
  software organiza, calcula, rastreia e alerta — não decide.

Posicionamento: *"Plataforma de acompanhamento cardiometabólico com IA explicável e
auditável, leitura automática de exames, prescrição de hábitos e evolução clínica
mensurável."*

Wedge inicial: obesidade, DM2, hipertensão, dislipidemia, esteatose, risco
cardiovascular. Público: endocrinologia, cardiologia, MFC, nutrologia, médico do
emagrecimento, clínicas de check-up e programas corporativos.

## Regras inquebráveis (override de qualquer prompt)

1. **SaMD / ANVISA** — alertas ao paciente são SEMPRE informativos
   ("valor fora da faixa de referência — converse com seu médico"), nunca prescritivos.
   Score clínico, conduta e diagnóstico só existem na face do médico, com revisão humana
   obrigatória. Detalhe em `docs/01-visao-e-guardrails.md`.
2. **IA com humano no comando** — toda saída de IA que influencie risco, conduta ou
   lista de problemas exige aceite, edição ou recusa **registrados**. Nada autônomo.
   Ver `.claude/rules/ia-clinica.md`.
3. **Auditabilidade** — todo evento clínico e toda inferência de IA gera trilha
   (quem, quando, fonte, versão, confiança, ação tomada). RLS em todas as tabelas sensíveis.
4. **Tudo iniciado pelo paciente** — vínculo médico-paciente, compartilhamento e exposição
   de dados são iniciados pelo paciente e revogáveis. Proibido: scraping de credenciais,
   prospecção autônoma de médicos, exposição retroativa de dados.
5. **CFM Art. 59/64** — monetização de médico apenas por SaaS mensal fixo.
   Nunca comissão por paciente nem taxa de indicação.
6. **Crédito científico** — todo score/insight carrega fonte primária (DOI/PubMed/diretriz),
   data de revisão, versão e escopo populacional. Nunca link interno quebrado ou fonte vaga.
   (Lição direta da fragilidade pública da Life Up.)
7. **IA é o último recurso na extração** — `hash/cache → texto nativo → OCR → limpeza/regex/
   dicionário → Claude só como fallback/validador`. Ver `docs/02-arquitetura-e-dados.md`.

## Stack

- Web: Next.js (App Router) · Mobile: Expo React Native (fase posterior)
- Dados/Auth: Supabase (Postgres + RLS)
- IA: Anthropic API — Haiku para extração/fallback, Sonnet para interpretação premium
- Interop: FHIR R4 + LOINC desde o dia 1 (prontidão RNDS)
- **Comprar, não construir no MVP**: assinatura ICP-Brasil, base de medicamentos +
  interações, vídeo de telemedicina

## Monorepo

`/apps/web` · `/apps/mobile` · `/packages/core` · `/packages/db` · `/packages/ai` · `/packages/ui`
Web = análise clínica / upload / dashboards. Mobile = captura contínua / wearables / notificações.

## O que NÃO construir agora

- Prescrição ou diagnóstico autônomo (sem médico no loop)
- App do paciente que entregue conduta médica
- TISS/faturamento, financeiro avançado, telemedicina nativa, white-label avançado,
  wearables, módulo corporativo, marketplace de protocolos → fase 2+
- Fine-tuning próprio antes de 500–2.000 exames revisados

## Convenções

- Português nas specs e na UI; código e identificadores em inglês.
- Spec-driven: decisão complexa termina em markdown em `docs/` antes de implementar.
- Medir antes de decidir (ex.: harness A/B de extração por laboratório).

## Mapa das specs

- `docs/01-visao-e-guardrails.md` — posicionamento + reconciliação regulatória (SaMD)
- `docs/02-arquitetura-e-dados.md` — stack, pipeline de extração, schema unificado
- `docs/03-mvp-cockpit-cardiometabolico.md` — escopo do MVP (paciente + médico)
- `docs/04-roadmap.md` — fases e ordem de construção
