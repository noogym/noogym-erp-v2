# ADR 0015: Web-admin API-first nas stores operacionais

## Status

Aceita.

## Contexto

O `web-admin` evoluiu para operar como SaaS conectado ao `noogym-erp-api`. Algumas stores ainda inicializavam visualmente com mocks/localStorage e algumas escritas online usavam IDs locais temporarios como se fossem IDs remotos.

Isso criava risco de dados falsos na primeira pintura, falhas silenciosas e chamadas como `PATCH /plans/PLN-...` ou `PATCH /products/PRD-...`.

## Decisao

No `web-admin`, a API e a fonte de verdade dos modulos principais. As stores online devem limpar o estado inicial antes de buscar dados remotos e devem propagar erro para o shell exibir falhas por modulo.

Registros sincronizados devem carregar `remoteId`. Escritas online devem usar `remoteId` quando existir. Quando o registro tiver apenas ID local, a store deve criar o recurso remoto com `POST` ou manter a alteracao local com aviso claro ao usuario; nao deve enviar IDs locais para endpoints remotos.

O shell do admin deve carregar os modulos online de forma nomeada, registrar quais falharam e exibir um banner com opcao de recarregar.

## Consequencias

- O usuario nao ve mocks como se fossem dados reais enquanto a API carrega.
- Erros de clientes, planos, produtos, check-ins, vendas, aulas, funcionarios, financas, operacional e treinos aparecem na UI.
- `remoteId` passa a fazer parte do contrato de dominio compartilhado para entidades sincronizaveis.
- Novas stores online devem seguir o mesmo padrao: `loadOnline` limpo, erro propagado, write com ID remoto seguro e toast para fallback local.
- Testes e2e do `web-admin` devem cobrir login e carga de modulos contra API real.
