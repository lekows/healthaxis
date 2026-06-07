# Checklist de seguranca e LGPD

## Objetivo

Orientar a revisao de seguranca e conformidade LGPD do fluxo medico-paciente do
HealthAxis. O foco e garantir que dados pessoais e dados pessoais sensiveis de
saude sejam tratados com finalidade definida, acesso minimo, consentimento
adequado e controles tecnicos coerentes.

Este checklist e um artefato tecnico-funcional e nao substitui avaliacao juridica,
relatorio de impacto ou politicas organizacionais aplicaveis.

## Atores envolvidos

| Ator | Responsabilidade |
| --- | --- |
| Titular/paciente | Decide sobre o compartilhamento e exerce seus direitos. |
| Medico autorizado | Usa os dados somente para a finalidade informada. |
| HealthAxis/controlador ou operador, conforme o contexto | Define e executa controles de tratamento e acesso. |
| Equipe de engenharia e seguranca | Mantem autenticacao, autorizacao, RLS e resposta a incidentes. |
| DPO/encarregado e juridico | Avaliam base legal, transparencia e atendimento aos titulares. |

## Fluxo passo a passo

1. Identificar quais dados pessoais e dados de saude aparecem no fluxo.
2. Confirmar a finalidade do compartilhamento medico-paciente e a base legal
   aplicavel com o responsavel juridico.
3. Validar o texto e a experiencia de consentimento antes da autorizacao.
4. Confirmar que o QR de convite exige aceite autenticado e que o QR temporario
   e tratado como credencial portadora com escopo, expiracao e revogacao.
5. Validar que a RLS permite leitura apenas ao medico vinculado e autorizado.
6. Testar painel, rota direta e graficos sob contas vinculadas e nao vinculadas.
7. Confirmar que revogacao, recusa e cancelamento bloqueiam novas leituras.
8. Revisar minimizacao, retencao, auditoria, resposta a incidentes e atendimento
   aos direitos do titular.
9. Registrar evidencias e responsaveis por eventuais pendencias.

## Regras de acesso

- Dados de saude sao dados pessoais sensiveis e exigem protecao reforcada.
- Cada medico deve acessar somente pacientes vinculados e autorizados.
- O acesso deve respeitar necessidade, finalidade e minimo privilegio.
- A autorizacao deve existir na camada de dados/RLS, independentemente da UI.
- O ID da rota e o QR de convite nao sao credenciais suficientes para acesso.
- A URL/token do compartilhamento temporario e uma credencial portadora e deve
  ser protegida como segredo enquanto estiver valida.
- O vinculo medico-paciente nao concede escrita, exclusao ou upload por si so.
- O consentimento deve ser demonstravel e sua revogacao deve ser respeitada para
  novas leituras.
- Erros, logs, metricas e evidencias de QA nao devem expor dados sensiveis.

## Riscos

| Risco | Impacto | Controle esperado |
| --- | --- | --- |
| Acesso por medico nao vinculado | Exposicao de dado sensivel | RLS, testes negativos e minimo privilegio. |
| Consentimento ambiguo ou nao demonstravel | Tratamento sem transparencia | Registro claro da decisao e contexto apresentado. |
| QR Code ou URL revelar dados | Vazamento acidental | Referencias opacas e validacao autenticada. |
| URL temporaria encaminhada a terceiro | Acesso por posse do token | Escopo minimo, expiracao, revogacao e cuidado com logs. |
| Revogacao sem efeito pratico | Acesso continuado indevido | Bloqueio de novas leituras e testes de sessao. |
| Coleta ou exibicao excessiva | Violacao de minimizacao | Mostrar somente dados necessarios a finalidade. |
| Logs com dados de saude | Exposicao secundaria | Sanitizacao e controle de acesso aos logs. |
| Falta de rastreabilidade | Investigacao e prestacao de contas prejudicadas | Trilhas de auditoria proporcionais e protegidas. |
| Retencao indefinida | Aumento do impacto de incidentes | Politica de retencao e descarte aprovada. |

## Criterios de aceite

- A finalidade e a base legal aplicavel estao documentadas e aprovadas pelos
  responsaveis adequados.
- O paciente recebe informacoes claras antes de consentir.
- E possivel demonstrar o estado de consentimento associado ao vinculo correto.
- Somente medicos vinculados e autorizados leem dados do paciente.
- Recusa, cancelamento e revogacao impedem novas leituras.
- QR Code, URLs, mensagens e logs nao revelam dados clinicos diretamente, e
  tokens temporarios nao sao registrados ou compartilhados indevidamente.
- O painel, a rota e os graficos respeitam minimizacao e isolamento.
- Existem processos definidos para incidentes, retencao e direitos do titular.

## Checklist de QA

### Consentimento e transparencia

- [ ] A finalidade do compartilhamento esta clara para o paciente.
- [ ] O contexto identifica adequadamente o medico ou a solicitacao.
- [ ] A decisao exige acao explicita e inequivoca.
- [ ] Recusa e cancelamento nao criam acesso.
- [ ] A revogacao bloqueia novas leituras.
- [ ] A equipe consegue demonstrar o estado do consentimento.

### Autenticacao e autorizacao

- [ ] Todos os atores sao autenticados nos pontos necessarios.
- [ ] Medico vinculado acessa somente o paciente autorizado.
- [ ] Medico nao vinculado e bloqueado pela camada de dados.
- [ ] Troca manual do ID da rota nao concede acesso.
- [ ] Nova sessao respeita imediatamente o estado atual de autorizacao.
- [ ] O vinculo nao concede escrita, exclusao ou upload.

### QR Code e interface

- [ ] O QR Code nao contem dados clinicos legiveis.
- [ ] O QR de convite nao libera dados sem aceite autenticado do paciente.
- [ ] O QR temporario e tratado como credencial portadora.
- [ ] O QR temporario respeita escopo, expiracao e revogacao.
- [ ] Solicitacoes invalidas falham de forma segura.
- [ ] Mensagens de erro nao confirmam nem revelam dados sensiveis.
- [ ] O painel lista somente pacientes autorizados.
- [ ] Graficos exibem somente dados do paciente selecionado.

### Dados, operacao e governanca

- [ ] A exibicao segue o principio da minimizacao.
- [ ] Logs e telemetria evitam dados pessoais sensiveis desnecessarios.
- [ ] Evidencias de QA usam dados ficticios ou adequadamente protegidos.
- [ ] Acesso operacional a dados e logs segue minimo privilegio.
- [ ] Politicas de retencao e descarte estao definidas.
- [ ] Processo de resposta a incidentes contempla dados de saude.
- [ ] Processo de atendimento aos direitos do titular esta definido.
- [ ] Pendencias possuem responsavel, prazo e evidencia de resolucao.
