# ADR 0013: Backend ERP API com NestJS para web-admin e desktop

## Status

Aceita.

## Contexto

O Noogym deixou de ser apenas uma experiencia desktop local-first e passou a ter tambem um `web-admin` SaaS. As duas superficies precisam representar o mesmo dominio operacional: ginasios, membros, planos, assinaturas, pagamentos, produtos, vendas POS, aulas, funcionarios, despesas, check-ins, treinos, agenda, mensagens, relatorios, integracoes e auditoria.

O `web-admin` precisa de uma API server-side para persistencia, autenticacao, multi-tenancy e regras centralizadas. O desktop continua com fluxo local-first no MVP, mas deve ter uma fronteira clara para sincronizacao futura com o backend.

## Decisao

Manter `apps/noogym-erp-api` como backend REST oficial do Noogym ERP, implementado com NestJS, TypeScript, Prisma ORM e PostgreSQL.

A API deve concentrar as funcionalidades server-side usadas pelo `web-admin` e expor uma superficie futura de integracao/sincronizacao para o desktop. O contrato HTTP deve ser documentado via Swagger/OpenAPI e Scalar, com autenticacao JWT, RBAC por `UserRole`, multi-tenancy por `organizationId`, validacao global de DTOs, respostas padronizadas e auditoria automatica para operacoes de escrita.

Os modulos operacionais devem ser explicitos quando representam fluxos reais do frontend. Produtos, vendas POS, aulas e funcionarios nao devem ser tratados apenas como mocks ou campos genericos; eles fazem parte do dominio ERP que o backend precisa persistir e validar.

As decisoes internas do backend ficam detalhadas em `apps/noogym-erp-api/docs/adr`.

## Consequencias

- O `web-admin` deve evoluir para consumir o `noogym-erp-api` nos fluxos reais de SaaS.
- O desktop pode continuar offline/local-first, mas integracoes futuras devem usar adapters para conversar com a API sem acoplar Electron ao backend.
- Regras server-side criticas, como assinaturas ativas, pagamentos, check-ins e relatorios, pertencem ao backend.
- Fluxos operacionais que ja existem no admin compartilhado devem ter representacao server-side quando forem promovidos de mock/local-first para SaaS.
- Packages compartilhados devem preservar separacao de responsabilidades: UI e estado de tela ficam nos clientes; regras puras podem ficar em `packages/core`; persistencia e autorizacao ficam na API.
- Mudancas de contrato da API devem atualizar a documentacao OpenAPI e, quando arquiteturalmente relevantes, os ADRs do backend.
