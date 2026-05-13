# ADR-0003: Implementar multi-tenancy por organizationId

## Status

Aceite

## Contexto

O Noogym e um SaaS. A mesma aplicacao deve servir varias organizacoes, mantendo isolamento logico entre os dados de cada cliente.

A maior parte das entidades principais possui `organizationId`, incluindo usuarios, membros, planos, assinaturas, pagamentos, despesas, treinos, exercicios, agenda, check-ins, mensagens e integracoes.

## Decisao

Implementar multi-tenancy por escopo de `organizationId`.

O `organizationId` e incluido no payload JWT no login/register e usado em services para filtrar consultas e operacoes principais.

Services devem aplicar `organizationId` em leituras, criacoes, atualizacoes e remocoes de entidades tenant-aware.

## Consequencias

Beneficios:

- Isolamento logico simples e explicito.
- Queries faceis de entender e auditar.
- Compatibilidade com uma unica base PostgreSQL.

Custos:

- Risco de vazamento se uma query esquecer `organizationId`.
- Necessidade de testes e revisoes em endpoints novos.
- Super admin global pode exigir politicas especificas no futuro.
