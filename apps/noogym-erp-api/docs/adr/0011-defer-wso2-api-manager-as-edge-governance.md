# ADR-0011: Adiar WSO2 API Manager como camada de governanca de APIs

## Status

Aceite

## Contexto

O Noogym ja possui uma API backend central em `apps/noogym-erp-api`, construida com NestJS, REST, JWT, RBAC, multi-tenancy por `organizationId`, validacao global, respostas padronizadas e documentacao OpenAPI/Swagger.

O `web-admin` consome essa API por uma URL configuravel em `NEXT_PUBLIC_NOOGYM_API_URL`, centralizada no cliente HTTP em `packages/admin/src/lib/api.ts`.

Existe interesse em usar o WSO2 API Manager como API Gateway e gerenciador de APIs para conectar frontend, backend e futuros consumidores. O WSO2 pode trazer beneficios importantes, como:

- Gateway central para APIs publicadas.
- Portal de desenvolvedor.
- Versionamento e ciclo de vida de APIs.
- Rate limiting e quotas por aplicacao, subscricao ou API.
- Politicas de seguranca na borda.
- Observabilidade e governanca para integracoes externas.
- Importacao e publicacao de APIs a partir de contratos OpenAPI.

Ao mesmo tempo, o uso imediato do WSO2 apenas para conectar o `web-admin` ao `noogym-erp-api` adicionaria complexidade operacional antes de existir uma dor clara:

- Mais infraestrutura para instalar, configurar, atualizar e monitorar.
- Mais um ponto de falha entre frontend e backend.
- Possivel duplicacao ou conflito entre autenticacao do backend e autenticacao/politicas do gateway.
- Maior complexidade em desenvolvimento local.
- Mais pontos de configuracao para CORS, certificados, ambientes e roteamento.
- Mais atrito para depurar erros HTTP como `401`, `403`, `429` e problemas de proxy.

## Decisao

Nao introduzir WSO2 API Manager como dependencia obrigatoria neste momento.

Manter o fluxo principal simples:

```text
web-admin -> noogym-erp-api
```

O WSO2 fica aceito como opcao de evolucao arquitetural para ambientes de staging/producao quando houver necessidade real de API Management:

```text
web-admin / mobile / desktop / integracoes externas -> WSO2 API Gateway -> noogym-erp-api
```

O `noogym-erp-api` continua sendo a fonte de regras de negocio, autenticacao de produto, autorizacao de dominio, validacao, multi-tenancy e contratos OpenAPI.

O WSO2, quando adotado, deve atuar principalmente como camada de borda e governanca:

- Publicar APIs a partir do OpenAPI exposto pelo backend.
- Aplicar rate limits, quotas e politicas de acesso.
- Isolar o backend de chamadas externas diretas.
- Expor portal e ciclo de vida para consumidores externos.
- Centralizar observabilidade de trafego e consumo.

## Regras

- Desenvolvimento local deve continuar podendo chamar o `noogym-erp-api` diretamente.
- O frontend deve depender apenas de variaveis de ambiente para alternar entre backend direto e gateway.
- O contrato OpenAPI do NestJS deve continuar sendo a fonte primaria para publicacao no gateway.
- Regras de negocio nao devem ser movidas para o gateway.
- Autorizacao de dominio, RBAC e escopo por organizacao continuam no backend.
- O gateway pode validar, bloquear, limitar ou encaminhar chamadas, mas nao deve substituir os services do backend.
- A adocao de OAuth/JWT emitido pelo WSO2 deve ser tratada como decisao separada, pois impacta `auth`, `JwtStrategy`, claims, roles e sessao do frontend.

## Pontos de Mudanca Quando Adotado

Se o WSO2 for adotado, os principais pontos afetados devem ser:

- `apps/web-admin/.env.example`
  Alterar `NEXT_PUBLIC_NOOGYM_API_URL` para apontar para o gateway nos ambientes em que ele estiver ativo.

- `packages/admin/src/lib/api.ts`
  Manter o cliente HTTP centralizado e garantir que headers, Bearer token e tratamento de erros continuem compativeis com respostas do gateway.

- `apps/noogym-erp-api/src/main.ts`
  Revisar CORS para aceitar apenas origens e gateways esperados nos ambientes publicados.

- OpenAPI/Swagger
  Usar `/openapi.json` como base para publicar ou atualizar a API no WSO2.

- Infraestrutura
  Adicionar configuracao de gateway, certificados, rotas, politicas, ambientes, deploy e observabilidade.

- Autenticacao
  Decidir se o WSO2 apenas repassa o JWT emitido pelo backend ou se passa a emitir/validar tokens como provedor OAuth/JWT principal.

## Consequencias

Beneficios:

- Mantem a arquitetura atual simples para o estagio do produto.
- Evita custo operacional antes de existir necessidade concreta.
- Preserva o NestJS como centro das regras de negocio e contratos.
- Mantem abertura para WSO2 sem acoplar o desenvolvimento local ao gateway.
- Facilita uma adocao gradual em staging/producao usando a URL configuravel do frontend.

Custos:

- Rate limiting, portal de desenvolvedor e governanca formal ficam adiados.
- Integracoes externas ainda dependerao de politicas implementadas no backend ou na infraestrutura atual.
- Sera necessario trabalho futuro de infraestrutura quando a camada de API Management se tornar prioridade.

## Criterios para Rever Esta Decisao

Esta decisao deve ser reavaliada quando pelo menos uma das condicoes abaixo acontecer:

- O Noogym expor APIs para parceiros, clientes externos ou integracoes de terceiros.
- Houver necessidade de planos de consumo, quotas ou monetizacao de API.
- Mobile, desktop e web exigirem politicas de trafego diferentes em producao.
- O backend precisar ser protegido de acesso externo direto.
- Observabilidade de consumo por aplicacao/cliente se tornar requisito operacional.
- Versionamento formal e ciclo de vida de APIs passarem a ser necessarios.
- A equipa decidir centralizar autenticacao e autorizacao de borda em um provedor/gateway.
