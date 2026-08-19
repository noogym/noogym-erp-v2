# ADR 0008: Fluxos simulados com dados mockados

## Status

Superada por [ADR 0015](0015-web-admin-api-first-stores.md) para o `web-admin`.
Continua valida apenas como estrategia de seed/demo para o desktop local-first.

## Contexto

O objetivo original era tornar o desktop visualmente operacional, sem backend real.

Depois da criacao do `noogym-erp-api` e da promocao do `web-admin` para SaaS, mocks nao podem ser dependencia visual/inicial dos modulos online.

## Decisao

Usar dados mockados iniciais apenas para experiencias locais/demo. No `web-admin`, as stores devem carregar dados reais da API, limpar o estado inicial online antes do fetch e indicar falhas por modulo.

Acoes que dependem de provedor externo devem ser ligadas a endpoints reais quando existirem ou declarar estado "nao configurado"; nao devem confirmar sucesso simulado.

## Consequencias

- Usuarios continuam conseguindo testar fluxos locais sem API.
- No `web-admin`, falhas de API aparecem na UI e nao devem ficar apenas no console.
- Dados mockados ainda podem existir como seed local, mas nao como fallback silencioso em modo online.
- Fluxos promovidos para SaaS devem usar contrato real da API.
