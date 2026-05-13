# ADR-0001: Usar NestJS modular para a API backend

## Status

Aceite

## Contexto

O Noogym ERP precisa de uma API escalavel para gerir organizacoes, unidades, usuarios, membros, planos, subscricoes, pagamentos, treinos, agenda, check-ins, mensagens, relatorios e integracoes.

O dominio tem varios limites funcionais claros e tende a crescer com novos modulos, regras de negocio e integracoes externas.

## Decisao

Usar NestJS com arquitetura modular.

Cada area funcional deve ter o seu proprio modulo, controller, service e DTOs. Controllers ficam responsaveis apenas por HTTP e delegam regras para services.

Estrutura principal:

```text
src/
  auth/
  organizations/
  gyms/
  users/
  members/
  plans/
  subscriptions/
  payments/
  expenses/
  checkins/
  exercises/
  workouts/
  appointments/
  messages/
  reports/
  integrations/
  audit-logs/
  common/
  prisma/
  config/
```

## Consequencias

Beneficios:

- Codigo organizado por dominio.
- Facilidade para adicionar novos modulos.
- Baixo acoplamento entre controllers e regras de negocio.
- Melhor compatibilidade com testes unitarios e e2e.

Custos:

- Mais ficheiros e estrutura inicial.
- Necessidade de disciplina para manter regras fora dos controllers.
