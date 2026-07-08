# ADR-0013: Usar URLs oficiais de producao nos clientes admin

## Status

Aceite

## Contexto

O `web-admin` e o desktop compartilham o cliente HTTP em `packages/admin`. Durante o desenvolvimento local, os clientes usavam `http://localhost:3333` como valor padrao para falar com o `noogym-erp-api`.

Esse padrao e conveniente em desenvolvimento, mas e perigoso para builds instalaveis e deploys de producao. Se um ambiente nao injeta as variaveis corretas no momento do build ou runtime, a aplicacao pode abrir normalmente e falhar apenas no login, cadastro ou sincronizacao, tentando falar com `localhost` na maquina do utilizador.

O desktop tambem precisa abrir o onboarding no portal web oficial, porque a criacao de conta, configuracao inicial, plano e pagamento devem acontecer no `web-admin`, enquanto o desktop fica como instalacao operacional local-first.

## Decisao

Os clientes administrativos devem usar URLs oficiais de producao como fallback seguro:

- API publica: `https://apiv1.noogym.com`
- Portal web/admin: `https://admin.noogym.com`
- Cadastro online: `https://admin.noogym.com/register`

O `packages/admin/src/lib/api.ts` passa a ter `https://apiv1.noogym.com` como `DEFAULT_API_URL` e `https://admin.noogym.com/register` como portal padrao de cadastro.

O `web-admin` deve configurar:

- `NOOGYM_API_URL=https://apiv1.noogym.com` para chamadas server-side, incluindo o BFF Next em `/api/auth/*`.
- `NEXT_PUBLIC_NOOGYM_API_URL=https://apiv1.noogym.com` para chamadas client-side.
- `NEXT_PUBLIC_NOOGYM_WEB_URL=https://admin.noogym.com/register` para links publicos.
- `NEXT_PUBLIC_NOOGYM_HTTP_ONLY_AUTH=true` em producao, para manter refresh token em cookie `HttpOnly` via BFF Next.

O desktop deve configurar:

- `VITE_NOOGYM_API_URL=https://apiv1.noogym.com`
- `VITE_NOOGYM_WEB_URL=https://admin.noogym.com/register`

Foram adicionados scripts explicitos para empacotamento de producao no desktop:

- `pnpm --filter @noogym/desktop build:prod`
- `pnpm --filter @noogym/desktop dist:win:prod`
- `pnpm --filter @noogym/desktop pack:win:prod`

## Consequencias

Beneficios:

- Builds de producao deixam de cair silenciosamente em `localhost`.
- O desktop instalado consegue autenticar contra a API publica e abrir o cadastro no portal oficial.
- O deploy Docker do `web-admin` tem defaults de producao coerentes com os dominios oficiais.
- O fluxo de onboarding fica centralizado no portal web, enquanto o desktop opera com SQLite local e sincronizacao pela API.

Custos:

- Desenvolvimento local deve sobrescrever as variaveis de ambiente quando quiser usar uma API local.
- Ambientes de preview/staging tambem devem configurar explicitamente suas URLs para nao usarem producao por engano.

## Regras

- Nenhum fallback de build/runtime para desktop ou web-admin deve apontar para `http://localhost:3333` em codigo compartilhado de producao.
- O desktop nao deve criar conta localmente; deve enviar o utilizador para o portal web quando ainda nao tiver conta.
- O desktop deve usar SQLite para operacao local, mas autenticacao inicial, bootstrap e sincronizacao continuam passando pela API.
- O `web-admin` em producao deve preferir `NOOGYM_API_URL` nas rotas server-side e `NEXT_PUBLIC_NOOGYM_API_URL` no client-side.
- Qualquer ambiente que nao seja producao deve declarar suas URLs explicitamente.

## Pontos de Evolucao

- Criar um ambiente `staging` com dominios proprios para testar releases sem tocar producao.
- Adicionar verificacao automatica no CI para impedir `http://localhost:3333` em bundles de producao.
- Separar scripts de build local, staging e producao se houver mais ambientes permanentes.
