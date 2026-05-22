# ADR 0010: Usar entrypoints modulares por cliente dentro da API unica

## Status

Aceita.

## Contexto

O Noogym possui mais de uma superficie cliente:

- `web-admin`: interface SaaS administrativa com dashboards, tabelas, relatorios e fluxos operacionais ricos.
- `desktop`: app Electron local-first, com necessidade futura de sincronizacao offline e possivel bootstrap de dados em massa.
- `mobile`: app futuro em Flutter, que deve consumir payloads menores e endpoints mais diretos.

Essas superficies podem precisar de formatos de resposta diferentes. O `web-admin` pode precisar de payloads agregados para dashboards; o desktop pode precisar de dados de sincronizacao; o mobile pode precisar de respostas mais leves para reduzir custo de rede, bateria e complexidade de tela.

Uma opcao seria criar BFFs fisicos separados, como `bff-web`, `bff-desktop` e `bff-mobile`. Essa opcao ainda nao e adequada para o estagio atual do produto porque aumentaria a complexidade operacional antes de haver necessidade real:

- Mais processos para deploy, logs, monitoramento e CI.
- Repeticao de autenticacao, autorizacao e validacao de contratos.
- Risco de duplicar regras de negocio fora dos services principais.
- Mudancas no dominio exigiriam coordenacao entre API central e multiplos BFFs.

Ao mesmo tempo, usar apenas endpoints CRUD genericos para todas as telas tambem nao e suficiente no medio prazo, porque obriga os clientes a montar dashboards, resumos e sincronizacao com muitas chamadas e muita regra no frontend.

## Decisao

Manter uma API NestJS unica e modular, adicionando entrypoints por cliente dentro do mesmo processo backend.

Os entrypoints ficam em `src/entrypoints` e devem ser controllers finos, orientados a experiencia cliente, consumindo os mesmos services, Prisma, guards, interceptors e filtros usados pelo restante da API.

Estrutura adotada:

```text
src/
  modules de dominio:
    auth/
    members/
    payments/
    products/
    sales/
    classes/
    employees/
    reports/
    ...
  entrypoints/
    web-admin/
    mobile/
    desktop/
```

Endpoints iniciais:

- `GET /entrypoints/web-admin/dashboard`
  Agrega dados relevantes para o dashboard do admin: organizacao, unidades, KPIs, produtos com estoque baixo, proximas aulas, vendas recentes e membros recentes.

- `GET /entrypoints/mobile/me/summary`
  Retorna um payload enxuto para experiencia mobile autenticada: usuario, organizacao, unidades associadas, perfil de funcionario quando existir, check-ins do dia e aulas do dia.

- `GET /entrypoints/desktop/sync/bootstrap`
  Retorna um bootstrap de sincronizacao para o desktop, com `since` opcional e `limit` controlado. O objetivo e preparar a superficie para sincronizacao offline sem acoplar Electron ao banco ou aos detalhes internos da API.

Esses endpoints nao substituem os modulos REST de dominio. Eles sao composicoes de leitura/experiencia. Escritas e regras de negocio devem continuar pertencendo aos services dos modulos de dominio.

## Regras

- Nao criar BFFs fisicos separados enquanto a diferenca entre web, desktop e mobile puder ser resolvida por controllers modulares na mesma API.
- EntryPoints nao devem duplicar regra de negocio critica.
- EntryPoints podem compor dados de varios modulos para reduzir round-trips dos clientes.
- EntryPoints devem usar `JwtAuthGuard`, `RolesGuard` quando necessario, validacao global, interceptors de resposta e auditoria ja existentes.
- Contratos dos entrypoints devem aparecer no Swagger/OpenAPI junto com os demais endpoints.
- Endpoints especificos por cliente devem viver sob `/entrypoints/<cliente>/...`.
- O desktop deve consumir entrypoints de sync em vez de acessar banco remoto diretamente.
- O mobile deve receber payloads menores, mas sem criar um backend separado antes de necessidade operacional clara.

## Consequencias

- O backend fica preparado para necessidades diferentes de web, desktop e mobile sem triplicar infraestrutura.
- O `web-admin` pode consumir endpoints agregados para dashboards e telas densas.
- O desktop ganha uma fronteira explicita para sincronizacao futura.
- O mobile pode nascer com contratos leves e especificos sem forcar GraphQL ou BFF separado no inicio.
- Services e regras de dominio continuam centralizados no `noogym-erp-api`.
- Se um cliente crescer a ponto de exigir deploy, escala ou ciclo de release independente, a pasta correspondente em `src/entrypoints` pode ser extraida para um BFF ou microservico NestJS futuro com menor atrito.

## Alternativas Consideradas

### BFFs fisicos separados agora

Rejeitada por enquanto. Aumentaria deploy, observabilidade, duplicacao de auth e manutencao antes de existir uma dor real que justifique essa separacao.

### Apenas CRUD REST generico

Rejeitada como unica abordagem. CRUD puro obriga o frontend a fazer muitas chamadas e a compor dados sensiveis no cliente, especialmente em dashboards, mobile e sincronizacao desktop.

### GraphQL agora

Adiada. GraphQL pode ser util no futuro para selecao fina de campos, mas adiciona complexidade em resolvers, autorizacao por campo, cache, dataloaders, N+1, upload, versionamento e observabilidade. O Noogym continua melhor servido por REST + OpenAPI neste momento.

## Criterios para Rever Esta Decisao

Esta decisao deve ser reavaliada quando pelo menos uma das condicoes abaixo acontecer:

- Mobile exigir ciclo de release e escala independentes da API principal.
- Desktop exigir sincronizacao bidirecional complexa, fila de conflitos e processamento separado.
- Web-admin precisar de composicoes muito pesadas que prejudiquem a latencia dos demais clientes.
- Times diferentes passarem a manter clientes e backends separados.
- Observabilidade ou deploy unico da API virar gargalo operacional.
