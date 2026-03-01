# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate

# 1. Set up root workspace files first
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# 2. Copy all package.json files (for workspace resolution) — do NOT copy source yet
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/identity/package.json ./apps/identity/

# 3. Run pnpm install from ROOT — this installs workspace deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# 4. NOW copy the actual source code
COPY packages/ ./packages/
COPY apps/identity/ ./apps/identity/

# 5. cd into the app directory and run a LOCAL install to populate that app's node_modules
WORKDIR /app/apps/identity
RUN pnpm install --frozen-lockfile

# 6. NOW run prisma generate and build — binaries will be found locally
RUN npx prisma generate
RUN npx nest build

WORKDIR /app

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/identity/package.json ./apps/identity/

RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/husky && chmod +x /usr/local/bin/husky
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/identity/dist ./apps/identity/dist
COPY --from=builder /app/apps/identity/src/generated ./apps/identity/src/generated
COPY --from=builder /app/apps/identity/prisma ./apps/identity/prisma

WORKDIR /app/apps/identity
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --schema=prisma/schema.prisma --skip-generate && node dist/main.js"]
