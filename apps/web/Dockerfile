FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
WORKDIR /app/apps/web
RUN pnpm build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/web/dist ./apps/web/dist
WORKDIR /app/apps/web
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]
