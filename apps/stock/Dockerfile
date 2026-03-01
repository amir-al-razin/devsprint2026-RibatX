# ---------- BUILDER ----------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy workspace package.json files
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/stock/package.json ./apps/stock/

# Install dependencies
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy full source
COPY packages/ ./packages/
COPY apps/stock/ ./apps/stock/

# Build stock service
WORKDIR /app/apps/stock
RUN pnpm build


# ---------- RUNNER ----------
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app/apps/stock

# Copy only built files
COPY --from=builder /app/apps/stock/dist ./dist
COPY --from=builder /app/apps/stock/node_modules ./node_modules
COPY --from=builder /app/apps/stock/package.json ./package.json
COPY --from=builder /app/apps/stock/prisma ./prisma

EXPOSE 3002

CMD ["node", "dist/main.js"]