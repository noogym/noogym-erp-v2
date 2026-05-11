# ADR 0009: Sincronizacao offline simulada

## Status

Aceita.

## Contexto

O Noogym deve operar mesmo sem internet e indicar pendencias de sincronizacao.

## Decisao

Manter `isOffline`, `pendingSync`, `syncState` e `syncNow` no store de app/sync. Acoes de dominio adicionam pendencias quando o app esta offline.

## Consequencias

- O botao "Sincronizar agora" mostra loading e zera pendencias.
- A barra inferior reflete o estado local-first.
- O comportamento prepara a UX para uma fila real de sincronizacao no futuro.
