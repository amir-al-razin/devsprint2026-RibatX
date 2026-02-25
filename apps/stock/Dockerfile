FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/stock/package.json ./apps/stock/
RUN pnpm install --frozen-lockfile
COPY packages/ ./packages/
COPY apps/stock/ ./apps/stock/
WORKDIR /app/apps/stock
RUN pnpm build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/stock/package.json ./apps/stock/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/stock/dist ./apps/stock/dist
WORKDIR /app/apps/stock
ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "dist/main.js"]
