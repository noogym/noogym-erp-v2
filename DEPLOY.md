# Noogym MVP Deploy

Este deploy sobe apenas a versao web do admin, a API e o MySQL.

## Arquitetura atual

- `web-admin`: Next.js em `http://localhost:3000`.
- `api`: NestJS em `http://localhost:3333`.
- `mysql`: banco MySQL usado pelo Prisma.
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

- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `NOOGYM_API_URL`
- `NEXT_PUBLIC_NOOGYM_API_URL`

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

## WSO2

Nao e necessario incluir WSO2 no MVP. A aplicacao fica funcional com `AUTH_PROVIDER=local`.

Quando o WSO2 entrar, a troca deve ficar concentrada no modulo de autenticacao:

- emissao/validacao de token;
- login/logout do frontend;
- mapeamento de claims para roles e permissoes.

As areas de negocio, como clientes, planos, vendas e relatorios, nao devem depender diretamente do provedor de identidade.
