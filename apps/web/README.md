# IUT Cafeteria — Web Frontend

TanStack Start (React 19 + TypeScript) frontend for the IUT Cafeteria ordering system.

## Stack

- [TanStack Start](https://tanstack.com/start) — full-stack React framework (Nitro SSR)
- [TanStack Router](https://tanstack.com/router) — file-based routing
- [ShadCN UI](https://ui.shadcn.com/) + Tailwind CSS 4
- Socket.io-client — real-time order status
- Vite 7 — dev server with proxy to backend services

## Local Development

```bash
# From the monorepo root — starts ALL services including the web app
pnpm turbo dev

# Start only the web app (assumes backend is already running)
pnpm turbo dev --filter=@ribatx/web
```

App runs at **http://localhost:4000**.

The Vite dev server proxies:

- `/api/*` → Order Gateway `:3000`
- `/socket.io/*` → Notification Hub `:3004`

## Environment Variables

Copy `/.env.example` to `/.env` at the monorepo root. The only web-specific variable:

| Variable             | Description                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_IFTAR_ITEM_ID` | cuid of the Iftar Box item in the stock DB. Get it with `curl http://localhost:3002/items \| jq -r '.[0].id'` after the stock service is running. |

## Docker

```bash
# From the monorepo root
docker compose up --build
```

## Routes

| Route    | Description                                                   |
| -------- | ------------------------------------------------------------- |
| `/login` | Student login                                                 |
| `/`      | Student dashboard — place order, track status, queue position |
| `/admin` | Admin dashboard — health grid, metrics chart, chaos toggles   |
