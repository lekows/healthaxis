# QA manual do fluxo medico-paciente

## Objetivo

Fornecer um roteiro reproduzivel de QA manual para validar o fluxo
medico-paciente do HealthAxis, incluindo QR Code, consentimento, painel medico,
rota `/doctor/patient/[id]`, RLS de leitura e graficos de biomarcadores.

O roteiro valida comportamento observavel. Ele nao orienta alteracoes em
migrations, RLS, rotas, componentes, tokens, revogacao, painel ou upload.

## Atores envolvidos

Preparar contas e dados distintos para evitar falsos positivos:

| Ator/dado | Uso no teste |
| --- | --- |
| Paciente A | Paciente que concedera consentimento ao Medico A. |
| Paciente B | Paciente sem vinculo com o Medico A. |
| Medico A | Medico autorizado para o Paciente A. |
| Medico B | Medico sem autorizacao para o Paciente A. |
| Biomarcadores A e B | Dados distinguiveis para validar isolamento entre pacientes. |

## Pre-condicoes

- As contas de teste estao ativas e autenticaveis.
- Paciente A e Paciente B possuem biomarcadores distinguiveis.
- Medico A e Medico B iniciam sem acesso indevido aos pacientes.
- O ambiente permite executar o fluxo de QR Code e consentimento.
- O testador consegue alternar sessoes sem compartilhar estado acidentalmente.

## Fluxo passo a passo

### Cenario 1: vinculo autorizado

1. Autenticar-se como o ator que inicia o fluxo de QR Code.
2. Gerar ou apresentar o QR Code conforme a experiencia existente.
3. Concluir a leitura do QR Code com o outro ator.
4. Autenticar-se como Paciente A, quando solicitado.
5. Conferir o contexto apresentado e conceder consentimento.
6. Autenticar-se como Medico A.
7. Confirmar que Paciente A aparece no painel medico.
8. Abrir `/doctor/patient/[id]` pelo painel.
9. Conferir os dados e graficos de biomarcadores do Paciente A.

Resultado esperado: Medico A acessa somente os dados permitidos do Paciente A.

### Cenario 2: isolamento entre pacientes

1. Permanecer autenticado como Medico A.
2. Alterar manualmente o ID da rota para o Paciente B.
3. Tentar acessar dados do Paciente B por navegacao direta e atualizacao da pagina.
4. Conferir o painel medico.

Resultado esperado: Paciente B nao aparece no painel e seus dados nao sao lidos.

### Cenario 3: isolamento entre medicos

1. Encerrar a sessao do Medico A.
2. Autenticar-se como Medico B.
3. Tentar abrir diretamente a rota do Paciente A.
4. Conferir a listagem do painel medico.

Resultado esperado: Medico B nao lista nem le dados do Paciente A.

### Cenario 4: recusa e cancelamento

1. Iniciar um novo pedido de vinculo sem conclui-lo.
2. Cancelar ou negar o consentimento do paciente.
3. Autenticar-se com o medico relacionado ao pedido.
4. Tentar listar e abrir o paciente.

Resultado esperado: nenhum acesso e concedido.

### Cenario 5: revogacao

1. Restaurar um vinculo autorizado entre Paciente A e Medico A.
2. Confirmar o acesso inicial do Medico A.
3. Revogar o consentimento pelo fluxo existente.
4. Atualizar painel e rota direta na sessao do Medico A.
5. Sair e entrar novamente como Medico A e repetir a consulta.

Resultado esperado: novas leituras sao negadas apos a revogacao.

### Cenario 6: escopo somente leitura

1. Autenticar-se como Medico A com vinculo autorizado.
2. Consultar a tela do Paciente A.
3. Verificar que o vinculo nao oferece capacidade indevida de escrever, excluir,
   alterar ou enviar exames.

Resultado esperado: o acesso medico permanece no escopo de leitura autorizado.

### Cenario 7: compartilhamento temporario por QR

1. Autenticar-se como Paciente A e abrir `/share`.
2. Selecionar exames distinguiveis e uma opcao de expiracao.
3. Gerar o QR temporario e abrir `/share/[token]`.
4. Confirmar os exames listados e a informacao de expiracao.
5. Confirmar que esse fluxo nao cria vinculo persistente com um medico.
6. Revogar o compartilhamento e tentar abrir novamente a mesma URL.

Resultado esperado: a URL valida apresenta o escopo temporario escolhido; depois
da revogacao, deixa de resolver, sem alterar os dados de saude do paciente.

## Regras de acesso

- Paciente A pode acessar os proprios dados.
- Medico A pode ler Paciente A somente enquanto autorizado.
- Medico A nao pode ler Paciente B.
- Medico B nao pode ler Paciente A.
- IDs de rota nao funcionam como credenciais.
- A URL `/share/[token]` funciona como credencial portadora temporaria e deve
  respeitar seu escopo, expiracao e revogacao.
- A interface e a camada de dados devem negar acessos indevidos.
- O vinculo de leitura nao concede escrita, exclusao ou upload.

## Riscos

| Risco do teste | Mitigacao |
| --- | --- |
| Sessao anterior contaminar o resultado | Encerrar sessao e limpar o contexto entre atores. |
| Dados iguais mascararem troca de paciente | Usar biomarcadores claramente distinguiveis. |
| Bloqueio apenas visual parecer suficiente | Testar rota direta, atualizacao e nova sessao. |
| Consentimento antigo produzir falso positivo | Confirmar o estado inicial antes de cada cenario. |
| Mensagem de erro expor informacao | Registrar texto e evidencias sem incluir dados sensiveis. |
| Token temporario vazar em evidencias | Ocultar a URL/token em capturas e relatos. |

## Criterios de aceite

- Todos os cenarios positivos funcionam sem erro inesperado.
- Todos os cenarios negativos negam acesso sem expor dados sensiveis.
- O painel e a rota direta apresentam comportamento consistente.
- A RLS impede leitura por medico nao vinculado.
- Os graficos correspondem exclusivamente ao paciente aberto.
- Recusa, cancelamento e revogacao nao deixam acesso residual.
- O medico nao recebe permissoes fora do escopo de leitura.
- O QR temporario respeita selecao, expiracao e revogacao sem criar vinculo.

## Checklist de QA

- [ ] Registrar ambiente, data, navegador e contas de teste.
- [ ] Executar o cenario de vinculo autorizado.
- [ ] Executar isolamento entre pacientes.
- [ ] Executar isolamento entre medicos.
- [ ] Executar recusa e cancelamento.
- [ ] Executar revogacao.
- [ ] Executar validacao de somente leitura.
- [ ] Executar compartilhamento temporario por QR.
- [ ] Testar painel, rota direta, atualizacao e nova sessao.
- [ ] Validar os graficos com dados distinguiveis.
- [ ] Confirmar ausencia de dados sensiveis em erros.
- [ ] Anexar evidencias sem expor dados pessoais reais.
- [ ] Registrar resultado, severidade e passos de reproducao de cada falha.
