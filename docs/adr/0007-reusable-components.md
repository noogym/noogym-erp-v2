# ADR 0007: Componentes reutilizaveis de formularios, modais e tabelas

## Status

Aceita.

## Contexto

O app tem muitos fluxos internos com formularios, confirmacoes, importacao, exportacao, tabelas, acoes e toasts.

## Decisao

Criar componentes reutilizaveis em:

- `components/modals`
- `components/forms`
- `components/ui`
- `components/tables`

## Consequencias

- Modais sempre possuem titulo, botao X, cancelar e acao principal.
- Formularios usam campos consistentes.
- Tabelas e acoes por linha seguem o mesmo padrao visual.
- Novos fluxos devem preferir estes componentes antes de criar UI nova.
