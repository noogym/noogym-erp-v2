# Noogym Monorepo

Monorepo Turborepo para o Noogym, com duas aplicacoes separadas e packages compartilhados. O app desktop existente foi movido para `apps/desktop` sem remover telas, stores, mocks, estilos ou fluxos locais.

## Stack

- Turborepo + pnpm workspaces
- Desktop: Electron + React + TypeScript + Vite + Tailwind CSS
- Web Admin: Next.js App Router + React + TypeScript + Tailwind CSS
- Packages compartilhados: UI, core, types, config e data-access

## Estrutura

```text
apps/
  desktop/
    Electron + React + Vite
  web-admin/
    Next.js App Router
packages/
  ui/
    componentes visuais compartilhados
  core/
    regras puras de negocio
  types/
    tipos, interfaces e enums
  config/
    Tailwind e TypeScript configs compartilhados
  data-access/
    interfaces de repositorio
    adapters desktopAdapter e webAdapter
```

## Instalar Dependencias

```bash
pnpm install
```

## Rodar Desktop

```bash
pnpm dev:desktop
```

O Vite roda em `http://127.0.0.1:5173` e o Electron abre a janela desktop automaticamente.

## Rodar Web Admin

```bash
pnpm dev:web
```

O Next.js roda em `http://localhost:3000`.

Rotas iniciais:

- `/login`
- `/dashboard`

## Rodar Tudo

```bash
pnpm dev
```

## Build

Build geral:

```bash
pnpm build
```

Build separado:

```bash
pnpm build:desktop
pnpm build:web
```

## Typecheck e Lint

```bash
pnpm typecheck
pnpm lint
```

## Packages Compartilhados

- `@noogym/ui`: `Button`, `Card`, `Badge`, `Input`, `Select`, `Modal`, `Tabs`, `Table`, `DropdownMenu`, `Toast`, `FormInput`, `FormSelect`, `FormTextarea`, `FormCheckbox`, `FormSwitch`, `MetricCard`.
- `@noogym/core`: regras puras de negocio, calculos de check-in, planos, faturacao, KPIs e helpers de moeda `Kz`.
- `@noogym/types`: tipos de dominio como `ClientRecord`, `PlanRecord`, `ProductRecord`, `CheckinRecord`, `SaleRecord` e `FinanceRecord`.
- `@noogym/config`: presets compartilhados de Tailwind e TypeScript.
- `@noogym/data-access`: interfaces de repositorio e adapters separados para desktop e web.

## Regras de Separacao

- `apps/web-admin` consome `@noogym/data-access/webAdapter` e nao importa Electron, IPC, SQLite, `fs`, `path` ou codigo especifico do desktop.
- `apps/desktop` continua isolado de Next.js.
- `packages/core` nao depende de React, Electron, Next.js, browser APIs ou banco de dados.
- `packages/ui` nao depende de Electron.

## Desktop Local-First

O desktop preserva o fluxo offline/local-first existente com stores Zustand, mocks locais, sidebar, topbar, bottom sync bar, autenticacao, modais e telas operacionais. A base segue preparada para trocar o armazenamento local por SQLite + Electron IPC.

## Web Admin SaaS

O `web-admin` prova o consumo dos packages compartilhados com login, layout administrativo e dashboard. O adapter atual usa mocks, mas a fronteira esta preparada para REST API + cookies/session.
