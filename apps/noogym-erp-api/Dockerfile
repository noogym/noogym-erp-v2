FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile --filter noogym --filter @noogym/noogym-erp-api...

FROM deps AS builder

RUN pnpm --filter @noogym/noogym-erp-api prisma:generate
RUN pnpm turbo build --filter=@noogym/noogym-erp-api

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3333

WORKDIR /app

RUN apk add --no-cache dumb-init openssl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/noogym-erp-api/node_modules ./apps/noogym-erp-api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/noogym-erp-api/dist ./apps/noogym-erp-api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/noogym-erp-api/prisma ./apps/noogym-erp-api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/noogym-erp-api/package.json ./apps/noogym-erp-api/package.json
COPY --chown=nestjs:nodejs apps/noogym-erp-api/docker-entrypoint.sh /usr/local/bin/noogym-api-entrypoint.sh

RUN chmod +x /usr/local/bin/noogym-api-entrypoint.sh

USER nestjs

WORKDIR /app/apps/noogym-erp-api

EXPOSE 3333

ENTRYPOINT ["dumb-init", "/usr/local/bin/noogym-api-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
