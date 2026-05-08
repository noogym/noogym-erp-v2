# ADR 0011: Autenticacao preservada no shell principal

## Status

Aceita.

## Contexto

O projeto ja possui telas de login, criar conta e recuperar senha. As novas funcionalidades nao devem quebrar autenticacao nem recriar o shell.

## Decisao

Manter o fluxo de autenticacao separado do shell principal. O app renderiza paginas operacionais apenas quando o usuario esta autenticado.

## Consequencias

- Alteracoes de telas operacionais nao substituem login ou cadastro.
- `App.tsx` continua responsavel por escolher rota de autenticacao ou shell autenticado.
- Componentes globais, como `ToastViewport`, entram no shell autenticado.
