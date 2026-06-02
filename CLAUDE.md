# HealthAxis — Contexto para o Agente

## O que é este projeto

Aplicativo de saúde preventiva pessoal. O usuário faz upload de laudos laboratoriais, o sistema extrai os biomarcadores via OCR (Claude Haiku), armazena no Supabase e exibe dashboards de tendência, alertas preventivos e linha do tempo de evolução.

## Stack

- **Next.js 15** App Router, TypeScript strict, porta `3002` (`npm run dev`)
- **Supabase** — PostgreSQL + Auth + Storage (bucket `exam-files`)
- **Tailwind CSS** — sem arquivo de tokens; cores ficam inline via `style={}`
- **Framer Motion** — animações; utilitários em `lib/motion.tsx`
- **Recharts** — gráficos de tendência dos biomarcadores
- **Lucide React** — ícones
- **Claude Haiku** (`claude-haiku-4-5-20251001`) — OCR de PDFs e imagens

## Design System (use sempre estes valores)

```
Background app:   #0D0D0B
Cards/canvas:     #141412
Bordas card:      rgba(255,255,255,0.07)
Bordas suaves:    rgba(255,255,255,0.06)

Texto primário:   #E8E4D9
Texto muted:      #9A9688
Texto faint:      #5A5A50

Verde (ótimo):    #52B788
Laranja (atenção):#F4A261
Vermelho (crítico):#C1440E

Border-radius cards:   rounded-3xl  (24px)
Border-radius botões:  rounded-2xl  (16px)
Border-radius badges:  rounded-full
```

Classe utilitária `text-ink` = `#E8E4D9`, `text-ink-muted` = `#9A9688`, `text-ink-faint` = `#5A5A50`, `text-forest` = `#52B788`, definidas via Tailwind em `globals.css`.

## Estrutura de rotas

```
/                   → landing page (pública)
/auth/login         → login
/auth/signup        → cadastro
/dashboard          → painel principal (score + biomarcadores + lembretes)
/exams              → resultados laboratoriais por categoria
/timeline           → linha do tempo clínica
/documents          → gestão de laudos/documentos
/body-map           → mapa corporal interativo
/anamnesis          → questionário de saúde
/overview           → visão geral da saúde
/report             → relatório para consulta médica
/profile            → perfil do usuário
```

## Componentes principais

```
components/layout/DashboardLayout.tsx  → sidebar + mobile header + page transition
components/dashboard/MetricCards.tsx   → HealthMetricCard, BiomarkerTrendCard, MetricsGrid
components/dashboard/EventCards.tsx    → PreventiveReminderCard, RiskAreaCard, RecentDocumentCard
components/shared/MedicalDisclaimer.tsx → aviso médico (use em todas as páginas)
components/ui/index.tsx                → Card, Badge, Button primitivos
lib/supabase/queries.ts               → todas as queries do banco (getProfile, getBiomarkers, etc.)
lib/utils.ts                          → getBiomarkerColor(status), getBiomarkerLabel(status)
lib/motion.tsx                        → HoverCard, AnimatedProgressBar, StaggerContainer, etc.
```

## Banco de dados (Supabase)

Tabelas principais:
- `profiles` — dados do usuário (name, age, sex, weight, height)
- `biomarkers` — valores atuais de biomarcadores por usuário (slug, name, value, unit, status, trend, category, reference, last_date)
- `biomarker_history` — histórico de medições (biomarker_slug, value, date_label, recorded_at)
- `documents` — laudos enviados (title, type, lab, date, status, tags)
- `preventive_reminders` — lembretes (title, description, due_date, priority)
- `health_scores` — scores (overall, metabolic, cardiovascular, lifestyle, preventive)

Status de biomarcador (nunca use "risk"): `optimal | attention | high | low | critical`

## Arquitetura

- **Server Components por padrão** — busca de dados no servidor, sem `useEffect` para dados
- `"use client"` apenas para: interatividade, animações, hooks de estado
- Autenticação via Supabase SSR — middleware em `middleware.ts` protege todas as rotas exceto `/` e `/auth/*`
- API route para OCR: `app/api/extract-exam/route.ts` — recebe FormData com PDF/imagem, retorna JSON com biomarcadores

## Regras de código

- **Sem comentários** — exceto quando o "porquê" é não-óbvio (workaround, invariante oculta)
- **Sem abstrações prematuras** — 3 linhas similares é melhor que uma abstração prematura
- **Sem error handling para cenários impossíveis** — confie nas garantias do framework
- **TypeScript strict** — sem `any`, sem type assertions desnecessárias
- **Não commitar `.env.local`** — chaves só em Vercel env vars e `.env.local` (gitignored)
- **Sem feature flags ou backwards-compat shims** — mude o código direto

## Como validar antes de commitar

```bash
npm run build   # TypeScript + Next.js build check
npm run lint    # ESLint
```

Se o build falhar, corrija antes de commitar.

## Como rodar

```bash
npm run dev     # dev server em http://localhost:3002
npm run build   # build de produção
```

## Fluxo de trabalho autônomo

1. Leia o próximo GitHub Issue com label `agent-task`
2. Implemente a melhoria seguindo os padrões acima
3. Rode `npm run build` para validar
4. Commite com mensagem clara no formato `feat:` / `fix:` / `ui:`
5. Feche o issue
