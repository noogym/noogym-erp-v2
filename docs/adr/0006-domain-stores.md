# ADR 0006: Stores por dominio operacional

## Status

Aceita.

## Contexto

O Noogym possui dominios independentes: clientes, planos, produtos, aulas, treinos, funcionarios, vendas, check-ins, financas, sincronizacao, modais e toasts.

## Decisao

Criar uma store por dominio operacional:

- `clientsStore`
- `plansStore`
- `productsStore`
- `classesStore`
- `workoutsStore`
- `employeesStore`
- `salesStore`
- `checkinsStore`
- `financeStore`
- `syncStore`
- `modalStore`
- `toastStore`

## Consequencias

- Cada pagina consome apenas o dominio que precisa.
- Acoes offline adicionam pendencias de sincronizacao de forma consistente.
- O codigo fica preparado para trocar `localStorage` por SQLite sem reescrever as telas.
