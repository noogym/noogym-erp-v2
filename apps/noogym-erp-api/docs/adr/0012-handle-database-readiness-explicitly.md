# ADR-0012: Tratar prontidao do banco de dados explicitamente

## Status

Aceite

## Contexto

O `web-admin` chama o `noogym-erp-api` em `http://localhost:3333` durante fluxos como login e cadastro. Antes desta decisao, o `PrismaService` executava `await this.$connect()` durante `onModuleInit()`.

Quando o PostgreSQL ainda nao estava online, demorava a aceitar conexoes ou reiniciava, a API podia nao chegar a escutar a porta `3333`. Nesse caso, o browser recebia `net::ERR_CONNECTION_REFUSED`, que indica que o frontend nao conseguiu falar com a API. A causa raiz podia ser o banco, mas o erro aparecia no frontend como API inacessivel.

Esse comportamento dificulta a experiencia local e torna menos claro diferenciar:

- API fora do ar.
- API online, mas banco ainda indisponivel.
- Credenciais invalidas.
- Erro interno real da aplicacao.

## Decisao

A API deve subir mesmo quando o banco ainda nao estiver pronto, manter um estado interno de prontidao do banco e tentar reconectar em background.

Foram definidos estes comportamentos:

- `PrismaService` inicia tentativas de conexao em background e registra estado, tentativas, ultimo erro e horario da ultima verificacao.
- `GET /health/live` retorna se o processo da API esta vivo, sem depender do banco.
- `GET /health` e `GET /health/ready` retornam prontidao completa. Quando o banco nao esta pronto, retornam `503 Service Unavailable` com `code: DATABASE_UNAVAILABLE`.
- Rotas de negocio que dependem do banco retornam `503 Service Unavailable` enquanto o banco nao estiver pronto.
- Erros de conexao Prisma durante uma requisicao tambem sao traduzidos para `503 DATABASE_UNAVAILABLE` e disparam nova tentativa de reconexao.
- O cliente HTTP do admin diferencia erro de rede (`API_UNREACHABLE`) de servico temporariamente indisponivel (`DATABASE_UNAVAILABLE`) e mostra mensagens apropriadas.

## Consequencias

Beneficios:

- O frontend consegue falar com a API mesmo enquanto o banco esta a iniciar.
- Erros temporarios de infraestrutura viram respostas HTTP controladas.
- O utilizador ve uma mensagem melhor do que erro generico de rede.
- Health checks conseguem separar liveness de readiness.
- Desenvolvimento local fica mais previsivel quando banco e API sobem em tempos diferentes.

Custos:

- A API passa a ter estado operacional de prontidao do banco.
- Existe uma camada global a proteger rotas que dependem do banco.
- Chamadas podem receber `503` durante janelas curtas de inicializacao ou reconexao.

## Regras

- O frontend nunca deve falar diretamente com o banco; deve falar apenas com a API.
- Rotas de negocio dependentes de Prisma nao devem tentar mascarar indisponibilidade do banco como `401`, `400` ou `500`.
- `503 DATABASE_UNAVAILABLE` deve representar uma condicao temporaria e recuperavel.
- `GET /health/live` deve permanecer independente do banco.
- `GET /health` e `GET /health/ready` devem indicar se a API esta pronta para atender fluxos reais.
- Scripts e orquestradores podem usar readiness para esperar o banco, mas a API nao deve depender disso para iniciar o processo HTTP.

## Pontos de Evolucao

- Adicionar healthcheck no Docker Compose, quando a infraestrutura local for versionada.
- Expor metricas de tentativas e tempo de indisponibilidade.
- Implementar backoff exponencial se o banco ficar indisponivel por longos periodos.
- Ajustar mensagens do frontend para incluir uma acao de "tentar novamente" quando a UI tiver componente padrao para isso.
