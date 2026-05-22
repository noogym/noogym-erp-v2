# ADR-0005: Expor API REST documentada com Swagger

## Status

Aceite

## Contexto

O backend sera consumido por frontend web, possiveis apps mobile e integracoes internas. A API precisa ser previsivel e facil de testar durante desenvolvimento.

## Decisao

Expor uma API REST com controllers NestJS e documentar com Swagger/OpenAPI em `/docs`.

Endpoints seguem nomes de recursos:

```text
/members
/plans
/subscriptions
/payments
/workouts
/appointments
/reports/overview
```

Acoes especificas usam subrotas verbais quando representam comandos de dominio:

```text
PATCH /payments/:id/mark-paid
PATCH /subscriptions/:id/cancel
POST /workouts/:id/assign-member
```

## Consequencias

Beneficios:

- Padrao conhecido pela equipa e clientes HTTP.
- Documentacao interativa disponivel em desenvolvimento.
- Boa compatibilidade com ferramentas de API e geradores OpenAPI.

Custos:

- Operacoes em tempo real podem exigir outro protocolo futuramente.
- Alguns comandos de dominio nao sao CRUD puro e precisam de convencoes claras.
