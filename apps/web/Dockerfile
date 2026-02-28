# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/web/package.json ./apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
WORKDIR /app/apps/web
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
RUN pnpm build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/web/package.json ./apps/web/
RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/husky && chmod +x /usr/local/bin/husky
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/web/.output ./apps/web/.output
WORKDIR /app/apps/web
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", ".output/server/index.mjs"]
