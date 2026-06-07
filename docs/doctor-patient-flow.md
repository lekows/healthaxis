# Fluxo medico-paciente

## Objetivo

Documentar o fluxo funcional que permite a um medico acessar dados de um paciente
do HealthAxis mediante vinculo ativo e consentimento valido. O fluxo cobre a
criacao do vinculo, a autorizacao do paciente, o acesso pelo painel medico, a
visualizacao da rota `/doctor/patient/[id]` e os graficos de biomarcadores.

Este documento descreve o comportamento esperado sem definir detalhes internos
de migrations, politicas RLS, tokens ou revogacao.

## Atores envolvidos

| Ator | Responsabilidade |
| --- | --- |
| Paciente | Inicia ou recebe a solicitacao de vinculo, concede consentimento e pode revoga-lo. |
| Medico | Solicita ou aceita o vinculo e consulta somente pacientes vinculados. |
| HealthAxis | Valida autenticacao, vinculo e consentimento antes de liberar leitura. |
| Banco de dados/Supabase | Aplica as regras de leitura para impedir acesso fora do vinculo autorizado. |

## Fluxo passo a passo

1. Paciente e medico autenticam-se em suas respectivas experiencias.
2. O medico gera no painel um QR de convite que aponta para `/connect/[token]`.
3. O paciente abre o convite, confere nome, CRM, UF e especialidade do medico e
   registra seu consentimento pelo botao de aceite.
4. O HealthAxis associa medico e paciente e considera o vinculo apto para leitura
   somente quando os requisitos de autorizacao estiverem satisfeitos.
5. O paciente vinculado passa a aparecer no painel medico.
6. O medico abre a rota `/doctor/patient/[id]`.
7. A aplicacao e a camada de dados validam que o medico autenticado possui
   vinculo ativo e consentimento valido para aquele paciente.
8. Quando autorizado, o medico visualiza os dados permitidos e os graficos de
   biomarcadores do paciente.
9. Quando o vinculo ou consentimento deixa de ser valido, novas leituras pelo
   medico devem ser negadas.

## Regras de acesso

- O paciente acessa os proprios dados conforme as regras normais da plataforma.
- O medico somente pode ler dados de pacientes com vinculo ativo e consentimento
  valido.
- Conhecer ou alterar manualmente o identificador em `/doctor/patient/[id]` nao
  concede acesso.
- A autorizacao deve ser aplicada na camada de dados por RLS, e nao apenas pela
  interface.
- O painel medico deve listar apenas pacientes que o medico pode consultar.
- A autorizacao de leitura nao implica permissao de escrita, exclusao, upload ou
  alteracao de exames.
- A revogacao deve impedir novas leituras sem depender apenas de esconder
  elementos visuais.
- O compartilhamento temporario em `/share/[token]` e um fluxo separado do
  vinculo persistente e possui regras proprias de escopo, expiracao e revogacao.

## Riscos

| Risco | Controle esperado |
| --- | --- |
| Acesso direto a paciente nao vinculado por troca de ID | RLS nega a leitura. |
| Listagem indevida no painel medico | Consulta retorna apenas vinculos autorizados. |
| Consentimento ausente, expirado ou revogado | Acesso e negado antes da exibicao dos dados. |
| Dados residuais apos revogacao | A interface atualiza o estado e novas consultas nao retornam dados. |
| Confusao entre leitura e escrita | Permissoes do medico permanecem restritas ao escopo autorizado. |
| Exposicao excessiva de dados | A tela mostra somente informacoes necessarias ao atendimento. |
| Erro de identidade entre contas ou sessoes | Toda consulta considera o usuario autenticado atual. |

## Criterios de aceite

- Um medico vinculado e autorizado encontra o paciente em seu painel.
- A rota `/doctor/patient/[id]` abre corretamente para um medico autorizado.
- Os graficos de biomarcadores exibem somente dados do paciente selecionado.
- Um medico sem vinculo nao consegue listar nem abrir dados do paciente.
- A troca manual do ID da rota nao contorna as regras de acesso.
- A ausencia ou revogacao do consentimento bloqueia novas leituras do medico.
- O medico nao recebe permissoes de escrita, upload ou alteracao de exames como
  consequencia do vinculo.
- O paciente continua acessando seus proprios dados conforme suas permissoes.

## Checklist de QA

- [ ] Vincular um medico e um paciente pelo fluxo previsto.
- [ ] Confirmar que o convite exibe nome, CRM, UF e especialidade do medico.
- [ ] Confirmar o consentimento do paciente.
- [ ] Confirmar que o paciente aparece no painel do medico vinculado.
- [ ] Abrir `/doctor/patient/[id]` a partir do painel.
- [ ] Validar dados de identificacao e graficos de biomarcadores.
- [ ] Confirmar que os graficos pertencem ao paciente selecionado.
- [ ] Tentar abrir o mesmo paciente com outro medico sem vinculo.
- [ ] Trocar manualmente o ID da rota para um paciente nao vinculado.
- [ ] Revogar o consentimento e repetir painel, rota direta e leitura de dados.
- [ ] Confirmar que o medico nao consegue escrever, excluir ou enviar exames.
- [ ] Repetir os testes apos sair e entrar novamente na conta.
- [ ] Verificar que mensagens de erro nao revelam dados sensiveis.
