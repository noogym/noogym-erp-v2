# ADR 0014: Setup local previsivel para desenvolvimento

## Status

Aceita.

## Contexto

O monorepo depende de web-admin, API NestJS, Prisma Client, PostgreSQL local e variaveis de ambiente. O ambiente ficava fragil quando dependencias, Prisma Client, banco ou seed nao estavam prontos.

## Decisao

Manter um comando oficial `pnpm setup:local` para preparar o ambiente local.

O setup deve criar envs locais quando faltarem, subir o PostgreSQL via Docker Compose, aguardar readiness do banco, gerar Prisma Client, aplicar migrations e executar seed demo quando necessario.

O script deve detectar processos de desenvolvimento que bloqueiam arquivos gerados do Prisma no Windows e orientar o encerramento, em vez de falhar com erro opaco.

## Consequencias

- Novos desenvolvedores tem um caminho unico para preparar o projeto.
- Erros comuns de Prisma, banco indisponivel e env ausente ficam mais previsiveis.
- O README deve documentar credenciais demo, requisitos e comandos de banco local.
- Mudancas em migrations, seed ou envs devem manter `setup:local` atualizado.
