# ADR 0004: Estado de UI e dominio com Zustand

## Status

Aceita.

## Contexto

O app precisa compartilhar rota ativa, autenticacao, tema, modo offline, sincronizacao, toasts e dados de dominio entre telas.

## Decisao

Usar Zustand para stores simples e independentes, sem introduzir um framework maior de estado.

## Consequencias

- Stores ficam em `src/renderer/store`.
- O estado pode ser consumido diretamente nas paginas e componentes.
- A solucao e leve para MVP desktop e pode evoluir para adaptadores locais mais fortes.
- Regras compartilhadas, como pendencias offline, ficam centralizadas.
