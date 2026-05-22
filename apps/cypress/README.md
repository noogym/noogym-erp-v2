# Noogym Cypress

Aplicacao de testes end-to-end do monorepo Noogym.

## Requisitos

Antes de rodar os testes, inicia a aplicacao alvo em outro terminal:

```bash
pnpm dev:web
```

Por padrao, os testes apontam para:

```bash
http://localhost:3000
```

Para trocar a URL:

```bash
CYPRESS_BASE_URL=http://localhost:5173 pnpm cypress:run
```

## Comandos

```bash
pnpm cypress:open
pnpm cypress:run
```

Se o pacote estiver instalado mas o binario ainda nao, instala com:

```bash
pnpm cypress:install
pnpm cypress:verify
```

Em maquinas com pouco espaco no `C:`, podes guardar o cache do Cypress dentro desta app:

```bash
CYPRESS_CACHE_FOLDER=apps/cypress/.cache/Cypress pnpm cypress:install
```
