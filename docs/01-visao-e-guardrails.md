# 01 — Visão, posicionamento e guardrails regulatórios

## A tensão que este documento resolve

Os três documentos de análise (concorrência Life Up, estratégia de software e cockpit do
médico) empurram o HealthAxis para uma **plataforma clínica B2B2C**: score clínico,
lista de problemas, prescrição de hábitos, alertas de conduta, dashboard populacional.

A arquitetura atual do HealthAxis foi desenhada como **organizador/visualizador/educador
do paciente**, deliberadamente não prescritivo, justamente para administrar risco de
reclassificação como SaMD (software como dispositivo médico) pela ANVISA.

À primeira vista isso parece conflito. Não é. É **um produto com duas faces**, e a
distinção entre elas é exatamente o que mantém o risco regulatório administrável.

## Princípio central: duas faces, uma base de dados

| | Face do paciente | Face do médico (cockpit) |
|---|---|---|
| Papel | organizar, visualizar, educar, preparar consulta | apoiar a decisão de um profissional licenciado |
| Saídas | faixas de referência, tendências, alertas **informativos** | score clínico, risco, lista de problemas, conduta sugerida |
| Quem decide | ninguém — o software só informa | **o médico**, sempre, com revisão obrigatória |
| Risco SaMD | baixo (não diagnostica, não prescreve) | administrável (decisão é humana; IA é apoio rastreável) |
| Função no negócio | aquisição de dados + hábito de upload (data moat) | camada de monetização (SaaS do médico) |

A reconciliação é esta: **funções que seriam arriscadas como SaMD se fossem autônomas e
voltadas ao paciente tornam-se defensáveis quando são ferramentas voltadas ao médico, em
que um profissional licenciado é o decisor e toda saída de IA é registrada, fundamentada
em fonte e exige aceite humano.**

O "HealthAxis Score" e a "prescrição de hábitos" não são o app dizendo ao paciente o que
fazer. São instrumentos que o **médico** calcula, revisa, edita e emite. O paciente os
recebe como o plano do seu médico, não como conselho médico do software.

## Por que isso também é a melhor jogada competitiva

A análise da Life Up aponta vulnerabilidades públicas concretas. O HealthAxis ataca cada uma:

- **Telemedicina não nativa** na Life Up → no roadmap do HealthAxis, integração de vídeo
  com fluxo que pareça nativo (consentimento, anamnese prévia, resumo, prescrição, retorno).
- **Baixa ênfase em interoperabilidade/TISS** → FHIR R4 + LOINC desde o dia 1; TISS como
  diferencial de fase 2 para clínicas com convênio.
- **IA opaca e dependente de terceiros** → IA explicável e auditável (este é o eixo onde
  o seu perfil de auditoria vira vantagem comercial, não só compliance).
- **Credibilidade científica frágil** — a página de referências da Life Up aponta para
  links **claude.ai quebrados**. Esta é a lição mais barata de todas: cada score,
  questionário e insight do HealthAxis carrega fonte primária, data, versão e escopo.

## Sequenciamento (não são dois produtos)

O beta testa médicos **e** pacientes juntos, então as duas faces entram no mesmo corte —
mas conectadas por uma fatia fina, não como dois produtos completos. A única dependência
real: o cockpit não exibe dado que o paciente ainda não enviou.

1. **Ingestão do paciente primeiro, por dependência** (upload de exames + timeline). Menor
   risco regulatório, cria o hábito de upload e **gera os dados longitudinais que o cockpit lê**.
2. **Vínculo médico-paciente é a ponte** (`/i/` e `/r/`) — entra junto, porque é o que
   conecta as faces.
3. **Cockpit base lê esses dados** (dashboard, lista, perfil) e fecha o fluxo ponta a ponta
   já no beta. O cockpit é, em grande parte, **camada de leitura** sobre o que o paciente
   produz, mais um punhado de tabelas novas (scores, planos, tarefas, alertas).

Não construir dois bancos paralelos. A face do médico consome o mesmo `biomarker_dictionary`,
as mesmas `extraction_runs` e a mesma trilha de auditoria. Aprofundamentos (score, IA de
anamnese, prescrição de hábitos) vêm logo depois, já com os médicos como design partners.

## Guardrails regulatórios (resumo operacional)

- **LGPD** — base legal e consentimento granulares; snapshot de consentimento com timestamp
  como prova; segregação controlador (clínica) / operador (plataforma); DPA; retenção
  configurável; console de incidentes; MFA; gestão de chaves.
- **LGPD Art. 20** — direito à revisão humana de decisão automatizada. Por isso a IA nunca
  fecha conduta sozinha; sempre há aceite/edição/recusa humana registrada.
- **ANVISA / SaMD** — paciente recebe informação, não prescrição. Conduta vive na face do
  médico. Linguagem dos alertas ao paciente: informativa, nunca imperativa.
- **CFM 2.314/2022 + Lei 14.510/2022** (telemedicina) — consentimento, identificação do
  médico, anexação segura ao prontuário, documentação conforme.
- **CFM Art. 59/64** — SaaS mensal fixo para o médico; nunca comissão/indicação.
- **Prontuário** — guarda mínima de 20 anos (Lei 13.787/2018); documentos assinados com
  ICP-Brasil quando exigido (receita de controle especial, antimicrobianos).
- **TISS (ANS)** — não no MVP; diferencial de fase 2 para saúde suplementar.

## A auditabilidade é o produto, não o rodapé

As tabelas que você já planejou — `agent_runs`, `extraction_feedback` (campo
`edited_output`), `extraction_runs` — são exatamente a evidência que a face do médico
precisa. Elas transformam afirmações de compliance em prova verificável (venda enterprise,
LGPD Art. 20) e, no futuro, viram dado de fine-tuning. Trate o "Trust Center" como feature
vendável, não como obrigação.
