# ADR-0002: Usar Prisma ORM com PostgreSQL

## Status

Aceite

## Contexto

O Noogym ERP precisa de persistencia relacional, transacoes, joins, constraints, enums, agregacoes para relatorios e suporte a dados financeiros.

O schema principal foi definido em Prisma e contem entidades com relacionamentos fortes, como Organization, Gym, User, Member, Plan, Subscription, Payment, Workout e Appointment.

## Decisao

Usar PostgreSQL como banco de dados principal e Prisma ORM como camada de acesso a dados.

O schema Prisma sera a fonte central da modelagem de dados. O acesso ao banco deve ocorrer por `PrismaService`, disponibilizado globalmente via `PrismaModule`.

## Consequencias

Beneficios:

- Tipagem forte em TypeScript.
- Migrations versionadas.
- Consultas expressivas e transacoes com `$transaction`.
- Boa experiencia para seed e evolucao de schema.

Custos:

- A aplicacao depende da geracao do Prisma Client.
- Mudancas no schema exigem migrations e revisao de impactos.
- Queries muito especificas podem exigir cuidado extra para performance.
