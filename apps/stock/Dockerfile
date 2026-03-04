# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app
RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/husky && chmod +x /usr/local/bin/husky
RUN pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm config set network-timeout 300000

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @ribatx/stock exec prisma generate
RUN pnpm --filter @ribatx/stock build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app
RUN pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm config set network-timeout 300000
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/stock/package.json ./apps/stock/
RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/husky && chmod +x /usr/local/bin/husky
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/stock/dist ./apps/stock/dist
COPY --from=builder /app/apps/stock/prisma ./apps/stock/prisma
COPY --from=builder /app/apps/stock/src/generated/prisma ./apps/stock/src/generated/prisma

WORKDIR /app/apps/stock
ENV NODE_ENV=production
EXPOSE 3002
CMD ["sh", "-c", "pnpm exec prisma db push --schema=prisma/schema.prisma --skip-generate && node dist/main.js"]
