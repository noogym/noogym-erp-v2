# ADR 0009: Sincronizacao offline simulada

## Status

Parcialmente superada por [ADR 0015](0015-web-admin-api-first-stores.md).
Continua valida para o desktop/local-first ate a fila real de sincronizacao substituir a simulacao.

## Contexto

O Noogym deve operar mesmo sem internet no desktop e indicar pendencias de sincronizacao.

No `web-admin`, o modo online deve tratar a API como fonte de verdade e nao deve assumir que uma pendencia local representa um recurso remoto.

## Decisao

Manter `isOffline`, `pendingSync`, `syncState` e `syncNow` no store de app/sync para o desktop/local-first. Acoes de dominio adicionam pendencias quando o app esta offline.

No `web-admin`, stores que escrevem na API devem separar IDs locais de IDs remotos usando `remoteId`. Criacoes locais ainda nao sincronizadas nao podem ser atualizadas via `PATCH /:id` usando IDs como `CLI`, `PLN`, `PRD`, `SALE`, `CLS`, `FUNC` ou `TRN`.

## Consequencias

- O botao "Sincronizar agora" continua representando a experiencia local-first.
- A barra inferior reflete o estado local-first no desktop.
- O `web-admin` passa a priorizar consistencia com API real e erros visiveis por modulo.
- A fila real de sincronizacao deve respeitar `remoteId`/IDs remotos quando for ampliada.
