# ADR 0005: Persistencia local-first com localStorage

## Status

Aceita.

## Contexto

O MVP precisa simular operacao offline/local-first, mantendo dados entre sessoes sem depender de API externa.

## Decisao

Persistir os dados operacionais no `localStorage` por meio de helpers em `src/renderer/lib/storage.ts`.

## Consequencias

- Criar, editar, importar, desativar e vender continuam funcionando offline.
- Os dados persistem localmente no renderer.
- A abordagem e suficiente para simulacao e validacao de UX.
- Uma futura integracao SQLite deve substituir o adaptador de persistencia, preservando os contratos das stores.
