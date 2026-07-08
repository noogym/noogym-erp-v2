FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile --filter noogym --filter @noogym/web-admin...

FROM deps AS builder

ARG NEXT_PUBLIC_NOOGYM_API_URL=https://apiv1.noogym.com
ARG NEXT_PUBLIC_NOOGYM_HTTP_ONLY_AUTH=true
ENV NEXT_PUBLIC_NOOGYM_API_URL=$NEXT_PUBLIC_NOOGYM_API_URL
ENV NEXT_PUBLIC_NOOGYM_HTTP_ONLY_AUTH=$NEXT_PUBLIC_NOOGYM_HTTP_ONLY_AUTH

RUN pnpm --filter @noogym/web-admin build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NOOGYM_API_URL=https://apiv1.noogym.com
ENV NEXT_PUBLIC_NOOGYM_API_URL=https://apiv1.noogym.com
ENV NEXT_PUBLIC_NOOGYM_HTTP_ONLY_AUTH=true
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web-admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-admin/public ./apps/web-admin/public

USER nextjs

WORKDIR /app/apps/web-admin

EXPOSE 3000

CMD ["node", "server.js"]
