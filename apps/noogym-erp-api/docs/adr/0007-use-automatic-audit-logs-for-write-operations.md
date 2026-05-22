# ADR-0007: Registrar auditoria automatica para operacoes de escrita

## Status

Aceite

## Contexto

O Noogym lida com dados sensiveis e operacionais, como membros, pagamentos, despesas, assinaturas e configuracoes.

E importante manter rastreabilidade minima sobre quem executou acoes de escrita.

## Decisao

Usar `AuditLogInterceptor` para registrar automaticamente operacoes HTTP de escrita:

```text
POST
PATCH
PUT
DELETE
```

O log registra:

- `organizationId`
- `userId`
- `action`
- `entity`
- `entityId`
- `metadata`
- `createdAt`

Os logs podem ser consultados em `GET /audit-logs` por usuarios autorizados.

## Consequencias

Beneficios:

- Auditoria transversal sem duplicar codigo em cada service.
- Rastreamento basico de alteracoes sensiveis.
- Base para compliance e suporte.

Custos:

- Auditoria atual registra metadados da request, nao diffs completos antes/depois.
- Escritas fora do ciclo HTTP nao sao capturadas automaticamente.
- Falhas silenciosas no log nao devem bloquear a operacao principal.
