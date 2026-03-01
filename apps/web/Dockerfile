# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate

# 1. Set up root workspace files first
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# 2. Copy all package.json files (for workspace resolution) — do NOT copy source yet
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/web/package.json ./apps/web/

# 3. Run pnpm install from ROOT — this installs workspace deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# 4. NOW copy the actual source code
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# 5. cd into the app directory and run a LOCAL install to populate that app's node_modules
WORKDIR /app/apps/web
RUN pnpm install --frozen-lockfile

# 6. NOW run build — binaries will be found locally
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
RUN npx vite build

WORKDIR /app

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
