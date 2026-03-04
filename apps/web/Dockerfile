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

WORKDIR /app
# VITE_ vars are build-time: bake them into the JS bundle so the browser
# can call real service URLs rather than relying on a runtime proxy.
ARG VITE_GATEWAY_URL=http://localhost:3000
ARG VITE_IDENTITY_URL=http://localhost:3001
ARG VITE_STOCK_URL=http://localhost:3002
ARG VITE_KITCHEN_URL=http://localhost:3003
ARG VITE_NOTIFICATION_URL=http://localhost:3004
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL \
    VITE_IDENTITY_URL=$VITE_IDENTITY_URL \
    VITE_STOCK_URL=$VITE_STOCK_URL \
    VITE_KITCHEN_URL=$VITE_KITCHEN_URL \
    VITE_NOTIFICATION_URL=$VITE_NOTIFICATION_URL
RUN pnpm --filter @ribatx/web build

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
COPY apps/web/package.json ./apps/web/
RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/husky && chmod +x /usr/local/bin/husky
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/web/.output ./apps/web/.output

WORKDIR /app/apps/web
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", ".output/server/index.mjs"]
