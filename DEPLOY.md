# Noogym MVP Deploy

Este deploy sobe apenas a versao web do admin, a API e o PostgreSQL.

## Arquitetura atual

- `web-admin`: Next.js em `http://localhost:3000`.
- `api`: NestJS em `http://localhost:3333`.
- `postgres`: banco PostgreSQL usado pelo Prisma.
- `AUTH_PROVIDER=local`: login e JWT continuam na API para o MVP.

## Subir localmente com Docker Compose

```bash
docker compose up -d --build
```

Para subir localmente com portas publicadas no host:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Para acompanhar logs:

```bash
docker compose logs -f
```

Para parar:

```bash
docker compose down
```

## Variaveis de ambiente

Use `deploy.env.example` como base para o ambiente publicado.

Campos que devem mudar em producao:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `NOOGYM_API_URL`
- `NEXT_PUBLIC_NOOGYM_API_URL`
- `SUPER_ADMIN_PASSWORD`

No Coolify, configure o dominio no servico correto e inclua a porta interna do container no campo de dominio:

```txt
web-admin -> https://demo.noogym.com:3000
api       -> https://api.demo.noogym.com:3333
```

O `:3000` e o `:3333` dizem ao proxy do Coolify para qual porta interna do container ele deve encaminhar o trafego. O utilizador continua acessando normalmente `https://demo.noogym.com`, sem escrever a porta no navegador.

Se o Coolify mostrar `502 Bad Gateway` mesmo com o container iniciado, verifique se o servico `web-admin` esta `healthy`. Os healthchecks da API e do web usam `CMD` com argumentos separados para evitar problemas de aspas no Linux. Depois de alterar healthcheck ou dominio, faca `Stop` e `Deploy/Start` no Coolify para recriar o estado do container.

Exemplo para dominio real:

```env
CORS_ORIGINS=https://admin.noogym.com
NOOGYM_API_URL=https://api.noogym.com
NEXT_PUBLIC_NOOGYM_API_URL=https://api.noogym.com
```

## Migrations

Por padrao a API roda:

```bash
prisma migrate deploy
```

antes de iniciar. Para desativar isso em algum ambiente controlado:

```env
RUN_MIGRATIONS=false
```

## Super admin de producao

Para garantir o super admin principal no deploy, configure:

```env
SUPER_ADMIN_EMAIL=noogym.startup@gmail.com
SUPER_ADMIN_NAME=Noogym Startup
SUPER_ADMIN_PASSWORD=<senha-forte-temporaria>
RUN_SUPER_ADMIN_BOOTSTRAP=true
```

O bootstrap cria ou promove esse usuario para `SUPER_ADMIN` na organizacao `noogym-platform`. Se o usuario ja existir, a senha nao e alterada por padrao. Para trocar a senha no proximo deploy:

```env
SUPER_ADMIN_ROTATE_PASSWORD=true
```

Depois da rotacao, volte `SUPER_ADMIN_ROTATE_PASSWORD=false`.

## E-mail

Para envio via Resend com fallback SMTP:

```env
EMAIL_PROVIDER=auto
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM="Noogym <noreply@noogym.com>"
EMAIL_LOGO_URL=https://admin.noogym.com/noogym-email-logo.png
EMAIL_SITE_URL=https://noogym.com
EMAIL_SUPPORT_URL=https://noogym.com/suporte
EMAIL_PRIVACY_URL=https://noogym.com/privacidade
EMAIL_TERMS_URL=https://noogym.com/termos
REDIS_URL=redis://redis:6379
EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_REQUIRED=false
EMAIL_WORKER_ENABLED=true
EMAIL_WORKER_CONCURRENCY=5
EMAIL_MAX_ATTEMPTS=5
EMAIL_RETRY_DELAY_MS=60000
EMAIL_RECOVERY_INTERVAL_MS=60000
EMAIL_RECOVERY_BATCH_SIZE=100
BACKGROUND_JOBS_ENABLED=true
BACKGROUND_JOBS_REQUIRED=false
BACKGROUND_WORKER_ENABLED=true
BACKGROUND_WORKER_CONCURRENCY=5
BACKGROUND_MAX_ATTEMPTS=5
BACKGROUND_RETRY_DELAY_MS=60000
BACKGROUND_RECOVERY_INTERVAL_MS=60000
BACKGROUND_RECOVERY_BATCH_SIZE=200
BACKGROUND_SCHEDULER_INTERVAL_MS=900000
BACKGROUND_RECURRING_ENABLED=true
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Noogym <noreply@noogym.com>"
```

Use `EMAIL_PROVIDER=resend` para forcar apenas Resend ou `EMAIL_PROVIDER=smtp` para forcar apenas SMTP. O dominio usado em `RESEND_FROM` precisa estar verificado no Resend.

Em producao, mantenha `EMAIL_QUEUE_ENABLED=true` com Redis persistente. A API grava o email antes de enfileirar, o worker processa em paralelo (`EMAIL_WORKER_CONCURRENCY`) e falhas sao repetidas com backoff ate `EMAIL_MAX_ATTEMPTS`. Use `EMAIL_QUEUE_REQUIRED=true` quando preferir falhar a requisicao em vez de enviar direto se Redis cair.

Para tarefas gerais, mantenha `BACKGROUND_JOBS_ENABLED=true`. Estes jobs usam a tabela `BackgroundJob` para historico/deduplicacao e Redis/BullMQ para execucao. O scheduler cria tarefas recorrentes de reconciliacao, expiracao de planos, lembretes, renovacao, limpeza de tokens, limpeza de ficheiros e metricas.

## WSO2

Nao e necessario incluir WSO2 no MVP. A aplicacao fica funcional com `AUTH_PROVIDER=local`.

Quando o WSO2 entrar, a troca deve ficar concentrada no modulo de autenticacao:

- emissao/validacao de token;
- login/logout do frontend;
- mapeamento de claims para roles e permissoes.

As areas de negocio, como clientes, planos, vendas e relatorios, nao devem depender diretamente do provedor de identidade.
