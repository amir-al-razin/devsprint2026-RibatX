# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy workspace manifests for layer-caching the install step
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/identity/package.json ./apps/identity/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/identity/ ./apps/identity/

WORKDIR /app/apps/identity
RUN pnpm build

# ─── Stage 2: Runner ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/identity/package.json ./apps/identity/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/identity/dist ./apps/identity/dist

WORKDIR /app/apps/identity
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]
