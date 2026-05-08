# ADR 0003: Design system dark premium com Tailwind

## Status

Aceita.

## Contexto

O produto Noogym tem identidade visual dark premium, neon lime, cards escuros, bordas suaves, overlays escuros e controles operacionais.

## Decisao

Usar Tailwind CSS com classes utilitarias, variaveis globais em `globals.css` e componentes pequenos para preservar consistencia visual.

## Consequencias

- Telas novas devem seguir o mesmo padrao de `panel`, `soft-card`, `icon-tile`, lime e bordas translucidas.
- Cards sao usados para itens, paineis e modais, evitando recriar uma landing page.
- O design privilegia densidade operacional para uso diario de academia.
