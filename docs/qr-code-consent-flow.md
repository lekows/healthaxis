# Fluxo de QR Code e consentimento

## Objetivo

Documentar os dois usos de QR Code no fluxo medico-paciente:

1. QR de convite do medico, usado para criar um vinculo persistente mediante
   consentimento explicito do paciente.
2. QR de compartilhamento temporario, gerado pelo paciente para disponibilizar
   exames selecionados por uma URL com token, expiracao e revogacao.

Detalhes internos do token, incluindo formato, validade e revogacao, devem seguir
a implementacao estabilizada e nao sao redefinidos neste documento.

## Atores envolvidos

| Ator | Responsabilidade |
| --- | --- |
| Paciente | Confere a solicitacao e decide conceder ou negar consentimento. |
| Medico | Gera o convite de vinculo e utiliza o compartilhamento apresentado pelo paciente. |
| HealthAxis | Resolve os tokens, autentica quando exigido e registra consentimento, uso e revogacao. |
| Servico de autorizacao/dados | Aplica as regras do vinculo persistente ou do compartilhamento temporario. |

## Fluxo passo a passo

### QR de convite e consentimento do vinculo

1. Um medico autenticado e com perfil medico gera um convite no painel `/doctor`.
2. O HealthAxis cria o convite e apresenta um QR/link para `/connect/[token]`.
3. O paciente abre o convite e visualiza nome, CRM, UF e especialidade do medico.
4. Ao selecionar `Aceitar e vincular`, o paciente e autenticado quando necessario.
5. O HealthAxis valida o convite segundo a logica de token existente.
6. Em caso de aceite valido, o vinculo e criado ou reativado com data e hora do
   consentimento, e o convite e marcado como utilizado.
7. Convite invalido, expirado ou recusado nao cria vinculo.
8. O paciente pode revogar posteriormente o vinculo em seu perfil.

### QR de compartilhamento temporario

1. O paciente autenticado abre `/share` e seleciona os exames que deseja
   compartilhar.
2. O paciente escolhe uma das opcoes de expiracao apresentadas e gera o QR.
3. O QR aponta para `/share/[token]` e funciona como credencial portadora
   temporaria: quem possui a URL valida consegue abrir o compartilhamento.
4. O HealthAxis valida expiracao e revogacao antes de resolver o token.
5. A visualizacao e registrada de forma best-effort.
6. O paciente pode revogar o link antes da expiracao.

O compartilhamento temporario e independente do vinculo persistente: ele nao cria
um vinculo medico-paciente e sua validade e limitada pelo token.

## Regras de acesso

- O QR Code nao deve conter dados clinicos diretamente; ele contem uma URL com
  token.
- No convite de vinculo, possuir o QR nao cria acesso sem aceite autenticado do
  paciente.
- No compartilhamento temporario, a URL/token e uma credencial portadora e deve
  ser protegida contra encaminhamento ou exposicao indevida.
- A identidade do usuario autenticado deve ser validada antes de registrar a
  decisao de consentimento.
- O consentimento deve ser livre, informado, inequivoco e associado ao vinculo
  correto.
- Solicitacoes invalidas segundo a logica de token existente devem falhar sem
  revelar dados sensiveis.
- A recusa nao cria permissao de leitura.
- A autorizacao efetiva depende das regras de dados/RLS, mesmo apos sucesso na
  interface.
- A revogacao do vinculo impede novas leituras pelo fluxo persistente.
- A expiracao ou revogacao do compartilhamento temporario invalida sua URL.

## Riscos

| Risco | Controle esperado |
| --- | --- |
| QR de convite fotografado ou compartilhado | Validacao do convite e aceite autenticado do paciente. |
| QR temporario encaminhado a terceiro | Tratar a URL como segredo, limitar validade e permitir revogacao. |
| QR Code associado ao medico ou paciente errado | Exibir contexto antes da confirmacao e validar identidades. |
| Consentimento registrado sem acao inequivoca | Exigir confirmacao explicita do paciente. |
| Reutilizacao indevida do convite | Aplicar a logica de convite utilizado, expirado ou revogado. |
| Vazamento de dados pelo conteudo do QR Code | Nao codificar dados clinicos diretamente. |
| Mensagem de erro revelar existencia do paciente | Usar resposta segura e sem detalhes sensiveis. |
| Interface indicar sucesso sem autorizacao real | Confirmar acesso pela camada de dados/RLS. |

## Criterios de aceite

- O QR Code inicia o fluxo esperado sem expor dados clinicos.
- Um usuario nao autenticado nao consegue concluir consentimento indevidamente.
- O paciente visualiza o contexto do pedido antes de decidir.
- O aceite explicito cria o estado necessario para o vinculo autorizado.
- A recusa, cancelamento ou falha nao libera leitura ao medico.
- Solicitacoes invalidas sao rejeitadas de forma segura.
- O medico so visualiza dados depois do consentimento e das validacoes de acesso.
- A revogacao impede novas leituras.
- O compartilhamento temporario respeita os exames escolhidos, a expiracao e a
  revogacao, sem criar vinculo persistente.

## Checklist de QA

- [ ] Ler um QR Code valido no fluxo esperado.
- [ ] Confirmar que autenticacao e exigida quando aplicavel.
- [ ] Verificar nome, CRM, UF e especialidade do medico antes do aceite.
- [ ] Aceitar o consentimento e confirmar o vinculo no painel medico.
- [ ] Negar o consentimento e confirmar que nenhum acesso foi criado.
- [ ] Cancelar o fluxo antes da confirmacao e verificar ausencia de acesso.
- [ ] Testar QR Code ou solicitacao invalida conforme a implementacao existente.
- [ ] Tentar reutilizacao indevida e confirmar o comportamento previsto.
- [ ] Inspecionar visualmente o QR Code e mensagens para ausencia de dados clinicos.
- [ ] Confirmar que erros nao revelam dados do paciente.
- [ ] Revogar o consentimento e testar nova leitura pelo medico.
- [ ] Repetir em sessoes de usuarios diferentes para evitar troca de identidade.
- [ ] Gerar QR temporario com exames e expiracao escolhidos pelo paciente.
- [ ] Confirmar que o QR temporario nao cria vinculo persistente.
- [ ] Confirmar que somente os exames selecionados sao listados.
- [ ] Testar URL temporaria valida, expirada e revogada.
- [ ] Confirmar que o token temporario e tratado como dado sensivel em evidencias.
