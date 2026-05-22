# ADR 0002: Renderer com Vite e componentes React

## Status

Aceita.

## Contexto

O renderer precisa de ciclo rapido de desenvolvimento, build previsivel e integracao simples com React.

## Decisao

Usar Vite como servidor e bundler do renderer React.

## Consequencias

- `pnpm dev` compila o processo principal, sobe Vite e abre Electron.
- `pnpm build` valida renderer e processo principal.
- Paginas e componentes devem continuar sob `src/renderer`.
- Imports devem permanecer compativeis com o fluxo de build Vite.
