# Noogym ERP API

Backend REST para o Noogym, um SaaS de gestao de ginasios, academias, membros, planos, pagamentos, treinos, agenda, check-ins, comunicacao, relatorios e integracoes.

Este app representa a camada backend/API do monorepo para o `web-admin` e para integracoes futuras do desktop. Ele foi construido com NestJS e centraliza autenticacao, multi-tenancy, autorizacao, persistencia, regras server-side e documentacao OpenAPI.

## Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Auth
- Bcrypt
- Class Validator / Class Transformer
- Swagger / OpenAPI
- Scalar API Reference

## Funcionalidades

- Autenticacao com register, login e perfil autenticado
- Multi-tenant por `organizationId`
- RBAC basico por `UserRole`
- Respostas HTTP padronizadas
- Validacao global de DTOs
- Swagger em `/docs`
- Scalar API Reference em `/reference`
- Auditoria automatica para acoes de escrita
- Paginacao e filtros comuns em listagens
- Seed demo com organizacao, unidade, admin, planos, membros, exercicios e treino

## Arquitetura

As principais decisoes arquiteturais estao documentadas em [docs/adr](./docs/adr/README.md).

## Modulos

- Auth
- Organizations
- Gyms
- Users
- Members
- Plans
- Subscriptions
- Payments
- Products
- Sales
- Employees
- Classes
- Expenses
- Check-ins
- Exercises
- Workouts
- Appointments
- Messages
- Reports
- Integrations
- Audit Logs
- Client Entrypoints para web-admin, mobile e desktop

## Requisitos

- Node.js 18+
- pnpm
- PostgreSQL

## Configuracao

Crie um ficheiro `.env` com base em `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/noogym?schema=public"
JWT_SECRET="change-me"
JWT_EXPIRES_IN="1d"
PORT=3000
```

## Instalacao

```bash
pnpm install
```

## Prisma

Gerar Prisma Client:

```bash
pnpm prisma:generate
```

Aplicar migrations no PostgreSQL:

```bash
pnpm prisma:migrate
```

Executar seed demo:

```bash
pnpm prisma:seed
```

Credenciais demo criadas pelo seed:

```text
Email: admin@noogym.com
Password: Noogym@123
```

## Executar

Desenvolvimento:

```bash
pnpm start:dev
```

Producao:

```bash
pnpm build
pnpm start:prod
```

API:

```text
http://localhost:3000
```

Swagger:

```text
http://localhost:3000/docs
```

Scalar:

```text
http://localhost:3000/reference
```

OpenAPI JSON:

```text
http://localhost:3000/openapi.json
```

## Scripts

```bash
pnpm build
pnpm format
pnpm lint
pnpm test
pnpm test:e2e
pnpm test:cov
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

## Autenticacao

Endpoints publicos:

- `POST /auth/register`
- `POST /auth/login`

Endpoints protegidos usam Bearer Token:

```http
Authorization: Bearer <accessToken>
```

Perfil autenticado:

- `GET /auth/me`

## Endpoints principais

Organizations:

- `GET /organizations/me`
- `PATCH /organizations/me`

Gyms:

- `GET /gyms`
- `GET /gyms/:id`
- `POST /gyms`
- `PATCH /gyms/:id`
- `DELETE /gyms/:id`

Users:

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`

Members:

- `GET /members`
- `GET /members/:id`
- `POST /members`
- `PATCH /members/:id`
- `DELETE /members/:id`

Plans:

- `GET /plans`
- `POST /plans`
- `PATCH /plans/:id`
- `DELETE /plans/:id`

Subscriptions:

- `GET /subscriptions`
- `POST /subscriptions`
- `PATCH /subscriptions/:id/cancel`
- `PATCH /subscriptions/:id/pause`

Payments:

- `GET /payments`
- `POST /payments`
- `PATCH /payments/:id/mark-paid`

Products:

- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PATCH /products/:id`
- `PATCH /products/:id/stock`
- `DELETE /products/:id`

Sales:

- `GET /sales`
- `GET /sales/:id`
- `POST /sales`
- `PATCH /sales/:id/cancel`

Employees:

- `GET /employees`
- `GET /employees/:id`
- `POST /employees`
- `PATCH /employees/:id`
- `DELETE /employees/:id`

Classes:

- `GET /classes`
- `GET /classes/:id`
- `POST /classes`
- `PATCH /classes/:id`
- `POST /classes/:id/enrollments`
- `PATCH /classes/:id/enrollments/:memberId`
- `DELETE /classes/:id`

Expenses:

- `GET /expenses`
- `POST /expenses`
- `PATCH /expenses/:id`
- `DELETE /expenses/:id`

Check-ins:

- `GET /checkins`
- `GET /checkins/today`
- `POST /checkins`

Exercises:

- `GET /exercises`
- `POST /exercises`
- `PATCH /exercises/:id`
- `DELETE /exercises/:id`

Workouts:

- `GET /workouts`
- `POST /workouts`
- `GET /workouts/:id`
- `PATCH /workouts/:id`
- `DELETE /workouts/:id`
- `POST /workouts/:id/exercises`
- `POST /workouts/:id/assign-member`

Appointments:

- `GET /appointments`
- `POST /appointments`
- `PATCH /appointments/:id`
- `DELETE /appointments/:id`

Messages:

- `GET /messages`
- `POST /messages`
- `PATCH /messages/:id/schedule`
- `PATCH /messages/:id/send`

Reports:

- `GET /reports/overview`
- `GET /reports/financial`
- `GET /reports/members`
- `GET /reports/workouts`
- `GET /reports/checkins`
- `GET /reports/sales`
- `GET /reports/products`
- `GET /reports/classes`
- `GET /reports/employees`

Client Entrypoints:

- `GET /entrypoints/web-admin/dashboard`
- `GET /entrypoints/mobile/me/summary`
- `GET /entrypoints/desktop/sync/bootstrap?since=2026-05-01T00:00:00.000Z&limit=500`

Integrations:

- `GET /integrations`
- `POST /integrations`
- `PATCH /integrations/:id`
- `DELETE /integrations/:id`

Audit Logs:

- `GET /audit-logs`

## Paginacao e filtros

Listagens suportam paginacao padrao:

```text
?page=1&limit=20&search=ana
```

Filtros comuns disponiveis nos principais modulos:

```text
status
gymId
method
startDate
endDate
```

Exemplo:

```text
GET /payments?page=1&limit=10&status=PAID&method=CASH&startDate=2026-04-01&endDate=2026-04-30
```

## Regras de negocio implementadas

- Um membro pode ter varias assinaturas, mas apenas uma assinatura `ACTIVE` valida por vez.
- Criar assinatura gera pagamento pendente quando o plano tem preco.
- Check-in so e permitido para membro `ACTIVE` com assinatura valida.
- Marcar pagamento como pago atualiza `paidAt`.
- Vendas POS geram itens, pagamento vinculado e baixa de estoque para produtos controlados.
- Cancelar venda POS cancela pagamentos vinculados e devolve estoque dos itens controlados.
- Aulas possuem capacidade, instrutor, sala e inscricoes/presencas de membros.
- Funcionarios podem existir como perfil operacional independente e opcionalmente vinculado a `User`.
- EntryPoints por cliente compoem payloads especificos para web-admin, mobile e desktop sem criar BFFs separados.
- Reports calculam KPIs de membros, receita, despesas, lucro, check-ins e treinos.
- Treinos suportam multiplos exercicios ordenados.
- Mensagens suportam WhatsApp, SMS, E-mail e Push como canais, salvando inicialmente no banco.

## Testes

```bash
pnpm test
```

Testes unitarios cobrem atualmente:

- `RolesGuard`
- utilitarios de paginacao
- regras de subscriptions
- regras de check-ins
- regras de payments

Build:

```bash
pnpm build
```
