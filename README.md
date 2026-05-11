# Noogym Monorepo

Monorepo Turborepo para o Noogym, com duas aplicacoes wrapper e packages compartilhados. As telas administrativas vivem em `packages/admin` e sao consumidas pelo desktop Electron e pelo web-admin Next.js.

## Stack

- Turborepo + pnpm workspaces
- Desktop: Electron + React + TypeScript + Vite + Tailwind CSS
- Web Admin: Next.js App Router + React + TypeScript + Tailwind CSS
- Packages compartilhados: admin, UI, core, types, config e data-access

## Estrutura

```text
apps/
  desktop/
    Electron + React + Vite
  web-admin/
    Next.js App Router
packages/
  admin/
    telas, layout, stores, mocks e estilos administrativos compartilhados
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

## Rodar Web Admin sem Docker

```bash
pnpm dev:web
```

O Next.js roda em `http://localhost:3000`.

Rotas iniciais:

- `/login`
- `/dashboard`

## Rodar Web Admin com Docker

Build da imagem:

```bash
pnpm docker:web:build
```

Executar container:

```bash
pnpm docker:web:run
```

Comandos equivalentes:

```bash
docker build -f apps/web-admin/Dockerfile -t noogym-web-admin .
docker run -p 3000:3000 noogym-web-admin
```

O build Docker deve ser executado a partir da raiz do repositorio, porque `apps/web-admin` depende dos packages compartilhados em `packages/*`. O Dockerfile fica em `apps/web-admin/Dockerfile`, mas o contexto precisa ser `.`.

## Deploy Coolify

No Coolify, use deploy por Dockerfile com:

- Base Directory / Build context: raiz do repositorio (`.` ou vazio)
- Dockerfile path / Dockerfile Location: `apps/web-admin/Dockerfile`
- Porta exposta: `3000`

Nao use `apps/web-admin` como Base Directory no Coolify. Se o contexto for `apps/web-admin`, o build falha porque o Dockerfile precisa de `pnpm-workspace.yaml`, `apps/*` e `packages/*` da raiz do monorepo.

Nao configure o `apps/desktop` no deploy web; o `.dockerignore` remove o Electron do contexto Docker.

## Deploy Vercel

Na Vercel, use o app `apps/web-admin` como projeto Next.js:

- Root Directory: `apps/web-admin`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output: gerido pelo Next.js/Vercel

O `output: "standalone"` continua compativel com Vercel, embora a Vercel nao precise usar o Dockerfile.

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

- `@noogym/admin`: app administrativo compartilhado com Dashboard, Check-in, Clientes, Planos, Vendas POS, Produtos, Aulas, Treinos, Funcionarios, Relatorios, Financas, Configuracoes e telas de autenticacao.
- `@noogym/ui`: `Button`, `Card`, `Badge`, `Input`, `Select`, `Modal`, `Tabs`, `Table`, `DropdownMenu`, `Toast`, `FormInput`, `FormSelect`, `FormTextarea`, `FormCheckbox`, `FormSwitch`, `MetricCard`.
- `@noogym/core`: regras puras de negocio, calculos de check-in, planos, faturacao, KPIs e helpers de moeda `Kz`.
- `@noogym/types`: tipos de dominio como `ClientRecord`, `PlanRecord`, `ProductRecord`, `CheckinRecord`, `SaleRecord` e `FinanceRecord`.
- `@noogym/config`: presets compartilhados de Tailwind e TypeScript.
- `@noogym/data-access`: interfaces de repositorio e adapters separados para desktop e web.

## Regras de Separacao

- `apps/web-admin` consome `@noogym/admin` e nao importa Electron, IPC, SQLite, `fs`, `path` ou codigo especifico de `apps/desktop`.
- `apps/desktop` consome `@noogym/admin` e continua isolado de Next.js.
- `packages/admin` nao pertence ao desktop nem ao web-admin; ele e a superficie compartilhada das telas reais.
- `packages/core` nao depende de React, Electron, Next.js, browser APIs ou banco de dados.
- `packages/ui` nao depende de Electron.

## Desktop Local-First

O desktop e o wrapper Electron/Vite sobre `@noogym/admin`. Ele preserva o fluxo offline/local-first existente com stores Zustand, mocks locais, sidebar, topbar, bottom sync bar, autenticacao, modais e telas operacionais. A base segue preparada para trocar o armazenamento local por SQLite + Electron IPC.

## Web Admin SaaS

O `web-admin` e o wrapper Next.js sobre `@noogym/admin`, portanto expõe as mesmas telas da versao desktop. O adapter atual usa mocks, mas a fronteira continua preparada para REST API + cookies/session.
