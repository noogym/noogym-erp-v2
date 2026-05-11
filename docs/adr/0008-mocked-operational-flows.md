# ADR 0008: Fluxos simulados com dados mockados

## Status

Aceita.

## Contexto

O objetivo atual e tornar o desktop visualmente operacional, sem backend real.

## Decisao

Usar dados mockados iniciais e acoes simuladas para check-in, clientes, planos, POS, produtos, aulas, treinos, funcionarios, relatorios, financas e configuracoes.

## Consequencias

- Usuarios conseguem testar fluxos principais sem API.
- Toasts comunicam sucesso de criacao, atualizacao, importacao, exportacao, desativacao, check-in e venda.
- Dados mockados devem parecer realistas para Angola e academia.
- Quando houver backend/local database, os fluxos de UI podem ser reaproveitados.
