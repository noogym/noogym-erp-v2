# Architecture Decision Records

Este diretorio guarda as decisoes arquiteturais do backend Noogym ERP.

Cada ADR documenta uma decisao relevante, o contexto em que foi tomada e as consequencias esperadas. O objetivo e manter um historico claro para futuras mudancas tecnicas.

## Indice

- [ADR-0001: Usar NestJS modular para a API backend](./0001-use-nestjs-modular-backend.md)
- [ADR-0002: Usar Prisma ORM com PostgreSQL](./0002-use-prisma-with-postgresql.md)
- [ADR-0003: Implementar multi-tenancy por organizationId](./0003-use-organization-scoped-multitenancy.md)
- [ADR-0004: Usar JWT com RBAC por UserRole](./0004-use-jwt-auth-and-role-based-access-control.md)
- [ADR-0005: Expor API REST documentada com Swagger](./0005-use-rest-api-with-swagger-documentation.md)
- [ADR-0006: Padronizar validacao, respostas e erros HTTP](./0006-standardize-validation-responses-and-errors.md)
- [ADR-0007: Registrar auditoria automatica para operacoes de escrita](./0007-use-automatic-audit-logs-for-write-operations.md)
- [ADR-0008: Versionar schema com Prisma migrations e seed demo](./0008-use-prisma-migrations-and-demo-seed.md)
