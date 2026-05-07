# Noogym ERP Desktop v1

Aplicacao desktop do Noogym para operacao de ginasios, recepcao e administracao. Esta versao foi construida com foco em uma experiencia desktop profissional, local-first, com navegacao completa entre os principais modulos do ERP.

## Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Zustand
- Dados mockados locais
- Adapter local-first baseado em `localStorage`

## Funcionalidades

- Navegacao sem reload pela sidebar.
- Tema dark premium inspirado nas telas oficiais.
- Tema light selecionavel e persistido localmente.
- Controles nativos da janela: minimizar, maximizar/restaurar e fechar.
- Simulacao de modo offline.
- Simulacao de pendencias de sincronizacao.
- Botao "Sincronizar agora" com estado temporario de sincronizacao.
- Layout desktop widescreen com ajustes de responsividade.
- Base preparada para futura troca de `localStorage` por SQLite.

## Telas Implementadas

- Dashboard
- Check-in
- Clientes
- Planos
- Vendas (POS)
- Produtos
- Aulas
- Treinos
- Funcionarios
- Relatorios
- Financas
- Configuracoes

## Como Rodar

Instale as dependencias:

```bash
npm install
```

Inicie o app em modo desenvolvimento:

```bash
npm run dev
```

O Vite roda em:

```bash
http://127.0.0.1:5173
```

O Electron abre automaticamente a janela desktop.

## Build

Gere o build de producao:

```bash
npm run build
```

O output e gerado em:

```bash
dist/
```

## Setup Windows

Gere o instalador Windows x64:

```bash
npm run dist:win
```

O instalador NSIS sera gerado em:

```text
release/Noogym-Desktop-Setup-1.0.0-x64.exe
```

Para gerar apenas a pasta executavel, sem instalador:

```bash
npm run pack:win
```

> A versao de teste e gerada sem assinatura de codigo. Em alguns computadores, o Windows SmartScreen pode exibir um aviso antes da instalacao.

## Scripts

```bash
npm run dev
```

Compila o processo principal do Electron, sobe o Vite e abre a janela desktop.

```bash
npm run build
```

Executa TypeScript, build do renderer e build do processo principal.

```bash
npm run dist:win
```

Gera o setup Windows x64 em `release/`.

```bash
npm run pack:win
```

Gera a aplicacao Windows descompactada em `release/win-unpacked/`.

```bash
npm run build:main
```

Compila apenas o processo principal do Electron.

```bash
npm run lint
```

Executa checagem TypeScript sem emitir arquivos.

## Estrutura

```text
src/
  main/
    main.ts
    preload.ts
  renderer/
    main.tsx
    App.tsx
    routes/
    components/
      layout/
      ui/
    pages/
    data/
    store/
    styles/
scripts/
  start-electron-dev.cjs
```

## Local-First

O modulo `src/renderer/data/localDb.ts` define um contrato simples de banco local. A implementacao atual usa `localStorage`, mas a interface foi criada para permitir substituicao futura por SQLite sem reescrever as telas.

## Observacao Sobre Electron no Dev

O script `scripts/start-electron-dev.cjs` remove variaveis como `ELECTRON_RUN_AS_NODE` antes de iniciar o Electron. Isso evita que o Electron rode como Node puro em ambientes onde essa variavel esteja definida.

## Tema

O tema e controlado pelo store global em `src/renderer/store/appStore.ts` e persistido em:

```text
localStorage["noogym:theme"]
```

Valores suportados:

- `dark`
- `light`
