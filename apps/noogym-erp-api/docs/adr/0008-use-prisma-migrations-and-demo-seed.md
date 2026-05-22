# ADR-0008: Versionar schema com Prisma migrations e seed demo

## Status

Aceite

## Contexto

O projeto precisa ser inicializado rapidamente em ambientes locais e manter historico de evolucao do banco.

Tambem e util ter dados demo para testar login, membros, planos, exercicios, treinos e assinaturas.

## Decisao

Versionar mudancas de banco com Prisma migrations em `prisma/migrations`.

Manter `prisma/seed.ts` com dados iniciais para desenvolvimento:

- Organizacao Noogym Demo
- Unidade Noogym Central
- Admin demo
- Planos demo
- Membros demo
- Exercicios demo
- Treino demo
- Assinatura e pagamento demo

Scripts principais:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Consequencias

Beneficios:

- Setup local mais rapido.
- Evolucao de schema versionada.
- Dados demo consistentes para validar fluxos principais.

Custos:

- Seed deve ser mantido alinhado ao schema.
- Ambientes de producao precisam de processo controlado para migrations.
