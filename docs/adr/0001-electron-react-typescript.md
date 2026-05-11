# ADR 0001: Aplicacao desktop com Electron, React e TypeScript

## Status

Aceita.

## Contexto

O Noogym precisa operar como software desktop para academia, com experiencia rica, acesso local e caminho futuro para persistencia local-first mais robusta.

## Decisao

Usar Electron para o empacotamento desktop, React para a interface do renderer e TypeScript para tipagem do renderer e do processo principal.

## Consequencias

- O app pode ser distribuido como aplicacao Windows.
- A UI continua baseada em componentes React reutilizaveis.
- TypeScript ajuda a manter contratos consistentes entre paginas, stores e componentes.
- O projeto deve manter separacao entre `src/main` e `src/renderer`.
