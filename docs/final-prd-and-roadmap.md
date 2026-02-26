# Final PRD & Implementation Roadmap

**Project:** DevSprint 2026 — IUT Cafeteria Distributed System
**Team:** RibatX
**Version:** 2.0 (Final)
**Status:** Ready for Implementation

---

## Part 1: Final Product Requirements Document

### 1. Executive Summary

**Objective:** Replace the failing "Spaghetti Monolith" with a resilient, event-driven microservices architecture capable of surviving the Ramadan rush peak-load scenario.

**Core Philosophy:** _Survival over Speed._ A failure in one service must never cascade to bring down the entire system.

**Deliverable:** A full-stack application (5 backend microservices + 1 frontend + infrastructure) launchable via a single `docker compose up`, and deployed to Railway.

---

### 2. Architecture Overview

**Pattern:** Event-Driven Microservices
**Monorepo:** Turborepo
**Inter-Service Transport:** Plain HTTP REST (synchronous), BullMQ on Redis (asynchronous), Socket.io (real-time push)

```
┌─────────────────────────────────────────────┐
│              Student / Admin UI              │
│   (TanStack Start – Route Groups: (student)  │
│    and (admin), single app on :4000)         │
└──────────────┬──────────────────────────────┘
               │ HTTP + WebSocket
┌──────────────▼──────────────────────────────┐
│           Order Gateway (Port 3000)          │  ← Token validation, Redis cache check
└──┬───────────┬──────────────────────────────┘
   │ HTTP      │ BullMQ
┌──▼──────┐ ┌─▼───────────┐
│  Stock  │ │   Kitchen   │
│ Service │ │    Queue    │
│ :3002   │ │   :3003     │
└─────────┘ └──────┬──────┘
                   │ HTTP
┌──────────────────▼────────────────────────┐
│         Notification Hub (:3004)           │  ← Socket.io
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│      Identity Provider (:3001)            │  ← JWT + Rate Limiting
└───────────────────────────────────────────┘

Infrastructure:
  Postgres (:5432)  — 5 logical databases
  Redis     (:6379)  — cache + BullMQ + rate limiting
```

---

### 3. Technology Stack (Locked)

| Layer         | Technology                                              | Notes                                                                                                             |
| ------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Monorepo      | Turborepo                                               | Shared `packages/types`, `packages/config`                                                                        |
| Frontend      | TanStack Start (React + TypeScript)                     | Single app `apps/web`. Route groups: `(student)` and `(admin)` share components and types directly                |
| UI Components | ShadCN (pre-configured template)                        | Radix UI + Tailwind primitives. Use ShadCN components by default; build custom only when ShadCN has no equivalent |
| Backend       | NestJS (Node.js + TypeScript)                           | 5 apps under `apps/`                                                                                              |
| ORM           | Prisma                                                  | 1 schema file per service, separate `DATABASE_URL`                                                                |
| Database      | PostgreSQL 15 (Alpine)                                  | Single container, 5 logical DBs via `init.sql`                                                                    |
| Cache / Queue | Redis (Alpine)                                          | BullMQ for Kitchen, ioredis for cache/rate-limit                                                                  |
| Real-Time     | Socket.io (via `@nestjs/platform-socket.io`)            | Notification Hub                                                                                                  |
| CI/CD         | GitHub Actions                                          | Runs tests on every push to `main`                                                                                |
| Cloud         | Railway                                                 | Full Docker Compose deployment                                                                                    |
| Validation    | `class-validator` + `class-transformer` (NestJS native) | Zod in frontend                                                                                                   |
| Auth          | `@nestjs/jwt` + `passport-jwt`                          | RS256 or HS256, 1h expiry                                                                                         |
| Testing       | Jest (NestJS default)                                   | Unit tests required; optional E2E                                                                                 |

---

### 4. Repository Structure

```
devsprint2026-RibatX/
├── apps/
│   ├── identity/          # Identity Provider  (NestJS, :3001)
│   ├── gateway/           # Order Gateway      (NestJS, :3000)
│   ├── stock/             # Stock Service      (NestJS, :3002)
│   ├── kitchen/           # Kitchen Queue      (NestJS, :3003)
│   ├── notification/      # Notification Hub   (NestJS, :3004)
│   └── web/               # Unified Frontend   (TanStack Start, :4000)
│       ├── app/
│       │   └── routes/
│       │       ├── (student)/         # Student layout + pages
│       │       │   ├── _layout.tsx    # Auth guard, JWT injection
│       │       │   ├── login.tsx
│       │       │   └── index.tsx      # Order dashboard
│       │       └── (admin)/           # Admin layout + pages
│       │           ├── _layout.tsx    # Admin auth guard
│       │           └── index.tsx      # Monitoring dashboard
├── packages/
│   ├── types/             # Shared TypeScript interfaces & Zod schemas
│   └── tsconfig/          # Shared tsconfig base
├── infra/
│   └── postgres/
│       └── init.sql       # Creates 5 logical databases
├── .github/
│   └── workflows/
│       └── ci.yml         # GitHub Actions pipeline
├── docker-compose.yml
├── turbo.json
└── README.md
```

---

### 5. Service Specifications

#### 5.1 Identity Provider (`apps/identity`)

**Port:** 3001
**Database:** `identity_db`

**Responsibilities:**

- User registration and login
- JWT issuance (HS256, 1h expiry, payload: `{ sub: studentId, name }`)
- Rate limiting: **3 login attempts per minute per student ID** (Redis counter with 60s TTL)

**Endpoints:**

| Method | Path             | Auth | Description               |
| ------ | ---------------- | ---- | ------------------------- |
| `POST` | `/auth/register` | None | Register a student        |
| `POST` | `/auth/login`    | None | Authenticate, receive JWT |
| `GET`  | `/health`        | None | Service health check      |
| `GET`  | `/metrics`       | None | Prometheus-style metrics  |

**Prisma Schema (identity_db):**

```prisma
model Student {
  id        String   @id @default(cuid())
  studentId String   @unique
  name      String
  password  String   // bcrypt hash
  createdAt DateTime @default(now())
}
```

**Rate Limit Implementation:**

- Key: `rate_limit:login:{studentId}`
- On each attempt: `INCR` key, set TTL 60s on first call
- Reject with `429 Too Many Requests` if count > 3

---

#### 5.2 Order Gateway (`apps/gateway`)

**Port:** 3000
**Database:** `order_db`

**Responsibilities:**

- JWT validation on every protected route (`Authorization: Bearer <token>`)
- Redis cache check: if `stock:{itemId}` in cache equals `0`, reject immediately with `409 Out of Stock`
- Forward valid orders to Stock Service (HTTP) for reservation
- Enqueue confirmed orders to BullMQ Kitchen Queue
- Expose idempotency key support: `X-Idempotency-Key` header stored in `order_db` to handle duplicate requests

**Endpoints:**

| Method | Path           | Auth      | Description                            |
| ------ | -------------- | --------- | -------------------------------------- |
| `POST` | `/orders`      | JWT       | Place an order                         |
| `GET`  | `/orders/:id`  | JWT       | Get order status                       |
| `GET`  | `/health`      | None      | Health check                           |
| `GET`  | `/metrics`     | None      | Metrics                                |
| `POST` | `/admin/chaos` | Admin JWT | Toggle simulated failure for a service |

**Order Flow:**

```
Client → Gateway
  1. Validate JWT (401 if missing/invalid)
  2. Check idempotency key (return cached response if duplicate)
  3. Check Redis cache: stock:{itemId} == 0 → 409
  4. HTTP POST → Stock Service /reserve
     ├── 409 sold out → return 409 to client
     └── 200 reserved
  5. Persist Order record (status: PENDING)
  6. BullMQ.add('kitchen', { orderId, studentId, itemId })
  7. Return 202 Accepted { orderId, status: 'PENDING' }
```

**Chaos Toggle:**

- Maintains a per-service `simulatedFailure` flag in Redis (`chaos:{serviceName}`)
- Gateway checks this flag before forwarding requests; returns `503` if toggled
- Used by Admin UI to demonstrate fault tolerance

---

#### 5.3 Stock Service (`apps/stock`)

**Port:** 3002
**Database:** `stock_db`

**Responsibilities:**

- Single source of truth for inventory
- Optimistic locking to prevent overselling during concurrent rushes
- Cache write-back: updates Redis after every successful stock change

**Endpoints:**

| Method | Path         | Auth     | Description                        |
| ------ | ------------ | -------- | ---------------------------------- |
| `POST` | `/reserve`   | Internal | Reserve 1 unit (called by Gateway) |
| `GET`  | `/items`     | Internal | List all items with current stock  |
| `GET`  | `/items/:id` | Internal | Get single item stock              |
| `GET`  | `/health`    | None     | Health check                       |
| `GET`  | `/metrics`   | None     | Metrics                            |

**Prisma Schema (stock_db):**

```prisma
model Item {
  id       String @id @default(cuid())
  name     String
  quantity Int    @default(0)
  version  Int    @default(0)   // Optimistic lock field
}
```

**Reservation Logic (Optimistic Locking):**

```sql
UPDATE "Item"
SET quantity = quantity - 1, version = version + 1
WHERE id = $itemId AND version = $currentVersion AND quantity > 0
```

- If 0 rows updated → conflict → retry up to 3 times, then return `409`
- On success → `SET stock:{itemId} {newQuantity}` in Redis (cache write-back)

---

#### 5.4 Kitchen Queue (`apps/kitchen`)

**Port:** 3003
**Database:** `kitchen_db`

**Responsibilities:**

- BullMQ worker that processes orders from the `kitchen` queue
- Simulates cooking time (3–7s random delay)
- After "cooking": updates order record status, triggers Notification Hub via HTTP

**BullMQ Worker Logic:**

```
job.data = { orderId, studentId, itemId }
1. Update order status → IN_KITCHEN  (HTTP PATCH → Notification Hub)
2. Simulate cooking: await sleep(random(3000, 7000))
3. Update order status → READY       (HTTP PATCH → Notification Hub)
4. Job complete
```

**Endpoints:**

| Method | Path            | Auth     | Description                                                  |
| ------ | --------------- | -------- | ------------------------------------------------------------ |
| `GET`  | `/queue/length` | Internal | Returns current BullMQ queue depth (for UI position display) |
| `GET`  | `/health`       | None     | Health check                                                 |
| `GET`  | `/metrics`      | None     | Metrics                                                      |

---

#### 5.5 Notification Hub (`apps/notification`)

**Port:** 3004
**Database:** `notify_db`

**Responsibilities:**

- Maintains persistent WebSocket connections with students
- Receives status update calls from Kitchen Queue (HTTP)
- Broadcasts order status events to the correct client room

**WebSocket Events (Server → Client):**

| Event              | Payload                 | Description         |
| ------------------ | ----------------------- | ------------------- |
| `order:pending`    | `{ orderId, position }` | Order acknowledged  |
| `order:in_kitchen` | `{ orderId }`           | Cooking has started |
| `order:ready`      | `{ orderId }`           | 🍽️ Ready for pickup |

**HTTP Endpoints (called by Kitchen):**

| Method  | Path               | Description                         |
| ------- | ------------------ | ----------------------------------- |
| `PATCH` | `/notify/:orderId` | Trigger broadcast for status change |
| `GET`   | `/health`          | Health check                        |
| `GET`   | `/metrics`         | Metrics                             |

**Room Strategy:** Each student joins a Socket.io room named `student:{studentId}` on connection. Notification Hub broadcasts to that room.

---

### 6. Health & Metrics Endpoints (All Services)

#### `GET /health`

Returns `200 OK` if the service and all its dependencies (DB, Redis) are reachable.
Returns `503 Service Unavailable` if any dependency is down.

```json
{
  "status": "ok",
  "service": "stock",
  "dependencies": {
    "postgres": "ok",
    "redis": "ok"
  }
}
```

#### `GET /metrics`

Returns machine-readable metrics:

```json
{
  "service": "gateway",
  "uptime_seconds": 3600,
  "orders_total": 142,
  "orders_failed": 3,
  "avg_latency_ms": 87,
  "cache_hits": 109,
  "cache_misses": 36,
  "p95_latency_ms": 210
}
```

> Latency is tracked via a rolling array of recent request durations (last 100 requests). Average and P95 are computed in-memory.

---

### 7. Infrastructure

#### `docker-compose.yml` (Root)

Services:

- `postgres` — `postgres:15-alpine`, mounts `./infra/postgres/init.sql`
- `redis` — `redis:alpine`
- `identity` — built from `apps/identity/Dockerfile`, port 3001
- `gateway` — built from `apps/gateway/Dockerfile`, port 3000
- `stock` — built from `apps/stock/Dockerfile`, port 3002
- `kitchen` — built from `apps/kitchen/Dockerfile`, port 3003
- `notification` — built from `apps/notification/Dockerfile`, port 3004
- `web` — built from `apps/web/Dockerfile`, port 4000 (serves both student and admin route groups)

All backend services depend on `postgres` and `redis` being healthy. Healthchecks are configured.

#### `infra/postgres/init.sql`

```sql
CREATE DATABASE identity_db;
CREATE DATABASE order_db;
CREATE DATABASE stock_db;
CREATE DATABASE kitchen_db;
CREATE DATABASE notify_db;
```

---

### 8. Frontend Specifications

**Single App:** `apps/web` — TanStack Start (React + TypeScript), Port 4000

Both the Student Journey and Admin Dashboard live in one TanStack Start application, separated by **Route Groups**. This gives strict layout isolation, no cross-group navigation leakage, and instant sharing of UI components and all types from `packages/types` without any additional wiring.

**UI Component Strategy:** The project uses a **pre-configured TanStack Start + ShadCN template** — Tailwind, Radix UI, and all ShadCN primitives are already set up. Use `pnpm dlx shadcn@latest add <component>` to pull in any component. Do not build custom components unless ShadCN has no equivalent.

**Route Group Structure:**

```
apps/web/app/routes/
├── (student)/
│   ├── _layout.tsx      # Checks for valid JWT; redirects to /login if missing
│   ├── login.tsx        # /login
│   └── index.tsx        # / — Order dashboard
└── (admin)/
    ├── _layout.tsx      # Admin auth guard (separate admin token or role claim)
    └── index.tsx        # /admin — Monitoring dashboard
```

> Route groups in TanStack Start wrap their children in a shared layout without affecting the URL path. The `(student)` and `(admin)` groups are completely isolated — their layouts, loaders, and context providers do not bleed into each other.

#### 8.1 Student Journey — Route Group `(student)`

**Routes:**

| Route    | File                  | Description                                 |
| -------- | --------------------- | ------------------------------------------- |
| `/login` | `(student)/login.tsx` | Login form → `POST /auth/login` → store JWT |
| `/`      | `(student)/index.tsx` | Order dashboard (protected by layout guard) |

**`(student)/_layout.tsx` responsibilities:**

- Read JWT from cookie/session storage
- If missing or expired → redirect to `/login`
- Inject `apiClient` (pre-configured with `Authorization: Bearer <token>`) into outlet context
- Establish Socket.io connection to Notification Hub on mount; disconnect on unmount

**Login Page (`/login`):**

- Student ID + password form
- On `429` response: show "Too many attempts. Try again in 60s."
- On success: store JWT, redirect to `/`

**Order Dashboard (`/`):**

- "Order Iftar" button
  - On click: optimistic state update immediately (button → "Placing Order...")
  - `POST /orders` with Bearer token
  - On `202`: button → "Order Placed ✓" (green); bind Socket.io listener for this `orderId`
  - On error (≥1s later): revert button state + show toast error
- **Status Tracker:** 4-step progress bar: `Pending → Stock Verified → In Kitchen → Ready`
  - Colors: Grey → Blue → Orange → Green (flashing on Ready)
  - Driven by `order:status` Socket.io events
- **Queue position badge:** "#N in queue" — polled from `GET /queue/length` every 5s

#### 8.2 Admin Dashboard — Route Group `(admin)`

**Routes:**

| Route    | File                | Description                                           |
| -------- | ------------------- | ----------------------------------------------------- |
| `/admin` | `(admin)/index.tsx` | Full monitoring dashboard (protected by layout guard) |

**`(admin)/_layout.tsx` responsibilities:**

- Validate admin role claim in JWT (or a separate admin token)
- If unauthorized → redirect to `/login`

**Monitoring Dashboard (`/admin`):**

| Widget          | Description                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health Grid     | 5 colored boxes (Green / Red) per service, polling each `/health` every 5s                                                                                                              |
| Live Metrics    | Orders/min, error rate, avg latency — polling Gateway `/metrics` every 3s                                                                                                               |
| Cache Hit Graph | ShadCN `<ChartContainer>` wrapping a Recharts `LineChart` (Recharts is bundled with ShadCN Charts — no separate install needed): `cache_hits` vs `cache_misses`, rolling 60 data points |
| Latency Alert   | Full-screen RED flash + banner if Gateway `avg_latency_ms > 1000` sustained over 30s                                                                                                    |
| Chaos Toggle    | Per-service toggle → `POST /admin/chaos { service, enabled }` on Gateway                                                                                                                |

**Shared Components — ShadCN Mapping:**

| Need                              | ShadCN Primitive                                         | Notes                                                               |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Status badge (Green/Red/Orange)   | `<Badge>` with `variant` prop                            | Add `variant: 'success' \| 'destructive' \| 'warning'` via `cn()`   |
| Toast notifications               | `<Sonner>` (`sonner` integration)                        | Already wired in template; call `toast.success()` / `toast.error()` |
| Loading spinner                   | Tailwind `animate-spin` on a `<Loader2>` icon (Lucide)   | Lucide is bundled with ShadCN                                       |
| Progress steps tracker            | `<Stepper>` or composed `<Badge>` + `<Separator>`        | Build once, reuse across both groups                                |
| Charts (cache hit graph)          | `<ChartContainer>` + `<ChartTooltip>` from ShadCN Charts | Wraps Recharts — run `pnpm dlx shadcn@latest add chart`             |
| Toggle switches (Chaos)           | `<Switch>`                                               | `pnpm dlx shadcn@latest add switch`                                 |
| Metric cards                      | `<Card>` + `<CardContent>`                               | `pnpm dlx shadcn@latest add card`                                   |
| `useMetricsPoller(url, interval)` | Custom hook — not a component                            | Build this once in `apps/web/hooks/`                                |

---

### 9. Security Requirements

| Requirement      | Implementation                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| Protected routes | Gateway rejects requests missing/invalid JWT with `401 Unauthorized`                                      |
| Password storage | bcrypt with salt rounds = 10                                                                              |
| JWT secret       | From env var `JWT_SECRET`; never hardcoded                                                                |
| Rate limiting    | Redis-based; 3 login attempts/min/studentId; returns `429`                                                |
| Internal routes  | Stock, Kitchen, Notification endpoints not exposed via Docker port mapping (internal Docker network only) |

---

### 10. CI/CD Pipeline (GitHub Actions)

**Trigger:** Push or PR to `main`

**Pipeline Steps:**

1. Checkout code
2. Install dependencies (`pnpm install`)
3. Build shared packages (`turbo build --filter=packages/*`)
4. Run unit tests:
   - `apps/gateway` — order validation tests
   - `apps/stock` — stock deduction / optimistic locking tests
5. Fail the build if any test fails

**Test Files (Required):**

- `apps/gateway/src/orders/orders.service.spec.ts` — validates order payload, idempotency key logic
- `apps/stock/src/stock/stock.service.spec.ts` — validates concurrency safety, version conflict handling

---

### 11. Bonus Features

| Feature                   | Location          | Implementation                                                                                                                        |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Rate Limiting             | Identity Provider | Redis INCR + TTL per student ID                                                                                                       |
| Visual Latency Alert      | Admin UI          | 30s rolling average on Gateway `/metrics`; flash alert if > 1s                                                                        |
| Cache Hit vs DB Hit Graph | Admin UI          | Gateway `/metrics` exposes `cache_hits` + `cache_misses`; rendered with ShadCN `<ChartContainer>` (Recharts-backed, no extra install) |
| Cloud Deployment          | Railway           | `docker-compose.yml` lifted to Railway; `railway.toml` configured                                                                     |

---

## Part 2: Step-by-Step Implementation Roadmap

### Overview

| Day   | Focus                                                            | Owner    |
| ----- | ---------------------------------------------------------------- | -------- |
| Day 1 | Foundation: monorepo, Docker skeleton, shared types, CI scaffold | All      |
| Day 2 | Identity Provider + Order Gateway core                           | Backend  |
| Day 3 | Stock Service + Redis caching layer                              | Backend  |
| Day 4 | Kitchen Queue + Notification Hub                                 | Backend  |
| Day 5 | Health/Metrics on all services + Unit Tests + CI complete        | Backend  |
| Day 6 | Student UI + Admin Dashboard                                     | Frontend |
| Day 7 | Integration, Polish, Cloud Deployment                            | All      |

---

### Day 1 — Foundation ✅ COMPLETE

**Goal:** Everyone can run `docker compose up` and see healthy containers. Monorepo structure exists.

**Tasks:**

- [x] Initialize Turborepo monorepo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`)
- [x] Create workspace structure (`apps/`, `packages/types`, `packages/tsconfig`)
- [x] Define shared types in `packages/types`:
  - `OrderStatus` enum: `PENDING | STOCK_VERIFIED | IN_KITCHEN | READY | FAILED`
  - `CreateOrderDto`, `OrderResponseDto`, `StockItem`, `HealthResponse`, `MetricsResponse`, `ChaosToggleRequest`, `OrderStatusEvent`, `NotifyOrderRequest`
- [x] Scaffold 5 NestJS apps via `pnpm dlx @nestjs/cli new <name>` (inside `apps/`)
- [x] Scaffold `apps/web` using `pnpm dlx shadcn@latest create --preset "..." --template start`
- [x] Create `(student)` and `(admin)` route group folders with layout, login, and dashboard stubs
- [x] Write `apps/web/src/hooks/useMetricsPoller.ts`
- [x] Write `infra/postgres/init.sql` (5 `CREATE DATABASE` statements)
- [x] Write root `docker-compose.yml` (Postgres + Redis + 5 backend services + web, all with healthchecks)
- [x] Write multi-stage `Dockerfile` for all 6 app containers
- [x] Create `.github/workflows/ci.yml` (install + build packages + test gateway + test stock)
- [x] Write `.env.example` and local `.env`
- [x] Verified: `docker compose up postgres redis -d` → both containers **healthy**
- [x] Verified: all 5 logical databases exist (`identity_db`, `order_db`, `stock_db`, `kitchen_db`, `notify_db`)
- [x] Verified: `pnpm turbo build --filter="./packages/*"` → **1 successful**

**Known local issue (machine-specific, not a project bug):**

> On this machine, running `docker compose up` for the first time after a reboot may fail with:
> `iptables: Chain 'DOCKER-ISOLATION-STAGE-2' does not exist`
>
> **Fix (run once per reboot):**
>
> ```sh
> sudo iptables -N DOCKER-ISOLATION-STAGE-2
> sudo iptables -N DOCKER-ISOLATION-STAGE-1
> ```
>
> Then re-run `docker compose up`. See the iptables explanation in the README for context.

**Checkpoint:** ✅ `docker compose ps` shows `ribatx_postgres` and `ribatx_redis` both `(healthy)`.

---

### Day 2 — Identity Provider + Order Gateway Core ✅ COMPLETE

**Goal:** A student can register, log in, receive a JWT, and the Gateway validates it.

**Tasks:**

**Identity Provider (`apps/identity`):**

- [x] Prisma schema (`Student` model), run `prisma migrate dev`
- [x] `AuthModule`: `POST /auth/register` (hash password with bcrypt), `POST /auth/login` (compare hash, issue JWT)
- [x] JWT module setup: `@nestjs/jwt`, sign with `JWT_SECRET` env var, 1h expiry
- [x] Rate limiting middleware: Redis INCR counter `rate_limit:login:{studentId}`, reject with 429 if > 3

**Order Gateway (`apps/gateway`):**

- [x] `JwtAuthGuard` using `passport-jwt`: validates Bearer token on protected routes
- [x] `POST /orders` route stub (returns 202 placeholder)
- [x] `GET /health` stub
- [x] Forward JWT validation to `@nestjs/passport` strategy (no DB call needed — just verify signature)

**Shared:**

- [x] Add `JWT_SECRET` to all `.env` files and `docker-compose.yml` environment section

**Checkpoint:** `curl -X POST /auth/login` returns a JWT. `curl -X POST /orders` without token returns `401`. With valid token returns `202`.

---

### Day 3 — Stock Service + Redis Cache ✅ COMPLETE

**Goal:** Stock is managed with optimistic locking. Gateway checks Redis cache before hitting Stock.

**Tasks:**

**Stock Service (`apps/stock`):**

- [x] Prisma schema (`Item` model with `version` field), seed 1 item (e.g., "Iftar Box", qty: 100)
- [x] `POST /reserve` endpoint:
  - Read current item (get `version`)
  - Execute optimistic-lock UPDATE
  - Retry up to 3 times on conflict
  - Return `200 { reserved: true, remaining: N }` or `409 { error: 'sold_out' }`
  - On success: write `SET stock:{itemId} {newQty}` to Redis
- [x] `GET /items` and `GET /items/:id` endpoints
- [x] Unit tests: `stock.service.spec.ts` (mock Prisma, test version conflict, test zero-stock path)

**Order Gateway — Cache Layer:**

- [x] On `POST /orders`: check `GET stock:{itemId}` from Redis
  - If value is `"0"` → return `409 Out of Stock` immediately (no DB call)
  - If key missing (cache miss): proceed and let Stock Service be the authority
- [x] Track `cache_hits` and `cache_misses` counters in-memory (exposed via `/metrics`)
- [x] Wire up `POST /orders` to call `POST http://stock:3002/reserve` via `HttpModule`

**Checkpoint:** Place 100 concurrent orders — exactly 100 succeed, rest get 409. Redis reflects correct stock. Metrics show cache hit ratio.

---

### Day 4 — Kitchen Queue + Notification Hub ✅ COMPLETE

**Goal:** Orders flow asynchronously through the kitchen. Students receive real-time status updates.

**Tasks:**

**Order Gateway — Queue Integration:**

- [x] Install `@nestjs/bull` + `bull` (or `bullmq`)
- [x] On successful stock reservation: `kitchenQueue.add('process', { orderId, studentId, itemId })`
- [x] Return `202 Accepted { orderId, status: 'PENDING' }` to client immediately

**Kitchen Queue (`apps/kitchen`):**

- [x] BullMQ Worker: `@Process('process')` handler
- [x] Step 1: `PATCH http://notification:3004/notify/:orderId` with `{ status: 'IN_KITCHEN' }`
- [x] Step 2: `await sleep(random(3000, 7000))`
- [x] Step 3: `PATCH http://notification:3004/notify/:orderId` with `{ status: 'READY' }`
- [x] `GET /queue/length` → returns current BullMQ waiting job count

**Notification Hub (`apps/notification`):**

- [x] Socket.io Gateway: `@WebSocketGateway({ cors: true })`
- [x] On connect: client emits `join` event with `studentId` → server does `socket.join('student:{studentId}')`
- [x] `PATCH /notify/:orderId` HTTP endpoint: looks up `studentId` for order → `io.to('student:{studentId}').emit('order:status', { orderId, status })`

**Idempotency (Gateway):**

- [x] Store `X-Idempotency-Key` → `orderId` mapping in Redis (24h TTL)
- [x] On duplicate key: return the cached response without re-processing

**Checkpoint:** Place an order → within <2s get `202`. Watch Socket.io events fire `IN_KITCHEN` then `READY` after 3–7s.

---

### Day 5 — Health/Metrics + Unit Tests + CI Green

**Goal:** All 5 services have working `/health` and `/metrics`. CI pipeline runs and passes.

**Tasks:**

**All Services:**

- [ ] `GET /health`: ping `prisma.$queryRaw('SELECT 1')` and `redis.ping()`. Return `200` or `503`
- [ ] `GET /metrics`: return structured JSON with uptime, orders totals, error counts, avg latency
- [ ] Request duration tracking: NestJS interceptor that records response time for every request, maintains a rolling array of last 100 durations

**Unit Tests:**

- [ ] `apps/gateway/src/orders/orders.service.spec.ts`:
  - Test: missing idempotency key → new order created
  - Test: duplicate idempotency key → cached response returned
  - Test: cache hit with stock = 0 → `409` thrown without calling Stock Service
  - Test: invalid JWT payload shape → `401`
- [ ] `apps/stock/src/stock/stock.service.spec.ts`:
  - Test: successful reservation decrements quantity and increments version
  - Test: version conflict (simulate 3 failures) → throws `409` after retries exhausted
  - Test: `quantity = 0` → immediate `409` without DB update

**GitHub Actions (`ci.yml`):**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm turbo build --filter=packages/*
      - run: pnpm turbo test --filter=apps/gateway --filter=apps/stock
```

**Checkpoint:** Push to `main` → GitHub Actions runs, all tests pass, green checkmark.

---

### Day 6 — Frontend: Unified `apps/web` (TanStack Start)

**Goal:** Both route groups are functional. The full student journey and admin observability work end-to-end in a single app.

**Tasks:**

**Foundation (`apps/web`):**

- [ ] Install only what the template doesn't already include: `socket.io-client` (run `pnpm add socket.io-client` in `apps/web`)
- [ ] Add required ShadCN components: `pnpm dlx shadcn@latest add badge card switch separator sonner chart`
- [ ] Configure TanStack Start `app.config.ts`: proxy `/api/*` to Gateway `:3000`, `/socket.io/*` to Notification Hub `:3004`
- [ ] Build the one custom piece: `useMetricsPoller(url, interval)` hook in `apps/web/hooks/`

**`(student)` Route Group:**

- [ ] `_layout.tsx`: read JWT from cookie → redirect to `/login` if absent/expired; establish Socket.io connection on mount
- [ ] `login.tsx`: Student ID + password form; handle `429` with countdown message; on success store JWT and redirect to `/`
- [ ] `index.tsx` (Order Dashboard):
  - "Order Iftar" button with optimistic update
  - `POST /api/orders` with Bearer token
  - On `202`: lock button to "Order Placed ✓"; listen for `order:status` Socket.io events
  - On error: revert + toast
  - Status Tracker: 4-step progress (Grey → Blue → Orange → Green flashing)
  - Queue position badge: poll `GET /api/queue/length` every 5s

**`(admin)` Route Group:**

- [ ] `_layout.tsx`: validate admin role in JWT; redirect if unauthorized
- [ ] `index.tsx` (Admin Dashboard):
  - Health Grid: poll all 5 service `/health` endpoints every 5s; render Green/Red ShadCN `<Badge>` per service
  - Metrics Panel: poll Gateway `/metrics` every 3s using `useMetricsPoller`; display in ShadCN `<Card>` widgets
  - Cache Hit Chart: ShadCN `<ChartContainer>` + Recharts `LineChart`, rolling 60-point buffer of `cache_hits` vs `cache_misses`
  - Chaos Toggle: ShadCN `<Switch>` per service → `POST /api/admin/chaos { service, enabled }`
  - Latency Alert: maintain 30s rolling avg of `avg_latency_ms`; if > 1000ms render full-screen red overlay

**Checkpoint:** Single `docker compose up` → browse `:4000` for Student UI, `:4000/admin` for Admin Dashboard. Full order flow completes. Chaos Toggle kills a service and both groups respond correctly.

---

### Day 7 — Integration, Polish & Cloud Deployment

**Goal:** The system is production-ready, fully integrated, and deployed to Railway.

**Tasks:**

**Integration & Bug Fixes:**

- [ ] Full end-to-end test of the happy path (login → order → kitchen → ready)
- [ ] Test chaos scenarios: kill Stock Service → Gateway serves cached data with warning
- [ ] Test rate limiting: 4th login attempt in 1 minute → 429
- [ ] Test optimistic locking: simulate concurrent orders exceeding stock
- [ ] Verify CI pipeline passes on a fresh push

**Railway Deployment:**

- [ ] Create Railway project, connect GitHub repository
- [ ] Add environment variables to Railway dashboard (`JWT_SECRET`, `DATABASE_URL` per service, `REDIS_URL`)
- [ ] Configure `railway.toml` or use nixpacks / Docker Compose deployment
- [ ] Verify `docker compose up` equivalent works on Railway
- [ ] Update `README.md` with live URL

**README.md:**

- [ ] Prerequisites (Docker, pnpm)
- [ ] `docker compose up` quick-start instructions
- [ ] Service port map
- [ ] Default credentials for demo (test student ID)
- [ ] Admin Dashboard URL
- [ ] Railway deployment URL (if done)

**Final Polish:**

- [ ] Ensure all services log meaningful messages (startup, errors, order processing)
- [ ] Remove hardcoded secrets, use `.env.example`
- [ ] Add loading states and error boundaries in both route groups
- [ ] Verify the submission checklist from the problem statement

---

### Submission Checklist

- [ ] `docker compose up` starts the entire system from scratch
- [ ] Student can register, login, place order, see real-time status
- [ ] Gateway returns `401` for unauthenticated requests
- [ ] Cache blocks requests when stock is `0`
- [ ] Orders are processed asynchronously (< 2s acknowledgment)
- [ ] WebSocket pushes status updates without polling
- [ ] All services expose `/health` and `/metrics`
- [ ] Admin Dashboard shows live health grid and metrics
- [ ] Chaos Toggle demonstrates graceful degradation
- [ ] Unit tests for Gateway (order validation) and Stock (deduction) pass
- [ ] GitHub Actions CI runs on push to `main` and fails on broken tests
- [ ] **Bonus:** Rate limiting (429 on 4th login attempt)
- [ ] **Bonus:** Latency alert flashes red when Gateway > 1s average
- [ ] **Bonus:** Cache Hit vs DB Hit graph visible on Admin Dashboard
- [ ] **Bonus:** Deployed to Railway with live URL in README

---

_End of Document_
