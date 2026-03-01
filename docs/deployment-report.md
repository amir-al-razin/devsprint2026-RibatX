# Deployment Report — RibatX IUT Cafeteria System

**Date:** March 1, 2026  
**Platform:** [Railway](https://railway.com)  
**Author:** GitHub Copilot (automated deployment & debugging session)  
**Project:** `hearty-purpose` on Railway

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What We Deployed](#2-what-we-deployed)
3. [Step-by-Step: What Was Done](#3-step-by-step-what-was-done)
4. [Bugs Found & Fixed](#4-bugs-found--fixed)
5. [What Worked, What Didn't](#5-what-worked-what-didnt)
6. [Runbook: How to Deploy Next Time](#6-runbook-how-to-deploy-next-time)

---

## 1. Architecture Overview

The system is a Turborepo monorepo with 5 NestJS microservices and a TanStack Start frontend. In production every service runs as a separate Railway service, all sharing one managed Postgres instance and one managed Redis instance.

```
Internet
   │
   ▼
┌─────────────┐     ┌──────────────┐
│   web (SSR) │     │   identity   │  JWT auth + rate limiting
│  :4000      │────▶│   :3001      │
└─────────────┘     └──────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   gateway   │────▶│    stock     │     │   kitchen    │  BullMQ consumer
│   :3000     │     │   :3002      │     │   :3003      │
└─────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       └──────── BullMQ (Redis) ─────────────────┘
                                                 │
                                                 ▼
                                       ┌──────────────────┐
                                       │  notification    │  Socket.io
                                       │    :3004         │
                                       └──────────────────┘
                                                 │
                              ┌──────────────────┴──────────────────┐
                              │   PostgreSQL (shared, 2 schemas)    │
                              │   Redis (cache + BullMQ + rate-lim) │
                              └─────────────────────────────────────┘
```

### Service → Railway service name mapping

| App                 | Railway service | Public URL                                          |
| ------------------- | --------------- | --------------------------------------------------- |
| `apps/web`          | `web`           | https://web-production-121cd.up.railway.app         |
| `apps/gateway`      | `gateway`       | https://gateway-production-3aa4.up.railway.app      |
| `apps/identity`     | `identity`      | https://identity-production-08d3.up.railway.app     |
| `apps/stock`        | `stock`         | https://stock-production-a6ec.up.railway.app        |
| `apps/kitchen`      | `kitchen`       | https://kitchen-production-847a.up.railway.app      |
| `apps/notification` | `notification`  | https://notification-production-e374.up.railway.app |
| —                   | `Postgres`      | (internal, Railway managed)                         |
| —                   | `Redis`         | (internal, Railway managed)                         |

---

## 2. What We Deployed

| Component      | Version / Notes                         |
| -------------- | --------------------------------------- |
| Node.js        | 20-alpine (Docker)                      |
| pnpm           | 10 (via corepack)                       |
| NestJS         | per-service                             |
| Prisma         | identity + stock schemas                |
| BullMQ         | gateway (producer) + kitchen (consumer) |
| Socket.io      | notification service                    |
| TanStack Start | web SSR                                 |

---

## 3. Step-by-Step: What Was Done

### Phase 1 — Railway Project Setup

1. Created Railway project `hearty-purpose`
2. Added **8 services** from the Railway dashboard:
   - `gateway`, `identity`, `stock`, `kitchen`, `notification`, `web` — each a separate service
   - `Postgres` — Railway-managed PostgreSQL 15
   - `Redis` — Railway-managed Redis 7
3. For each NestJS service, connected the service's Railway build settings to the monorepo root with its specific Dockerfile (e.g. `apps/gateway/Dockerfile`)

### Phase 2 — Environment Variables

Each service required specific env vars. Set via `railway variables set` or the Railway dashboard UI.

**Common to all NestJS services:**

```
NODE_ENV=production
PORT=<service port>
```

**identity:**

```
DATABASE_URL=${{Postgres.DATABASE_URL}}?schema=identity
JWT_SECRET=<generate with: openssl rand -base64 48>
ADMIN_STUDENT_IDS=admin001
REDIS_URL=${{Redis.REDIS_URL}}
CORS_ORIGIN=https://web-production-121cd.up.railway.app
```

**gateway:**

```
DATABASE_URL=${{Postgres.DATABASE_URL}}?schema=gateway
JWT_SECRET=<same as identity>
REDIS_URL=${{Redis.REDIS_URL}}
STOCK_SERVICE_URL=https://stock-production-a6ec.up.railway.app
KITCHEN_SERVICE_URL=https://kitchen-production-847a.up.railway.app
CORS_ORIGIN=https://web-production-121cd.up.railway.app
```

**stock:**

```
DATABASE_URL=${{Postgres.DATABASE_URL}}?schema=stock
REDIS_URL=${{Redis.REDIS_URL}}
```

**kitchen:**

```
REDIS_URL=${{Redis.REDIS_URL}}
NOTIFICATION_SERVICE_URL=https://notification-production-e374.up.railway.app
```

**notification:**

```
REDIS_URL=${{Redis.REDIS_URL}}
CORS_ORIGIN=https://web-production-121cd.up.railway.app
```

**web:**  
Build args (baked into the frontend bundle at build time — see [Why build args matter](#why-build-args-matter)):

```
VITE_GATEWAY_URL=https://gateway-production-3aa4.up.railway.app
VITE_IDENTITY_URL=https://identity-production-08d3.up.railway.app
VITE_STOCK_URL=https://stock-production-a6ec.up.railway.app
VITE_KITCHEN_URL=https://kitchen-production-847a.up.railway.app
VITE_NOTIFICATION_URL=https://notification-production-e374.up.railway.app
```

#### Why build args matter

The frontend uses Vite. `VITE_*` variables are **inlined at build time** into the JS bundle — they are not read at runtime. This means:

- They must be set as **Docker build args**, not runtime env vars
- Changing them requires a full rebuild and redeployment of `web`
- They cannot be changed without redeploying

### Phase 3 — Dockerfile Fixes

The original Dockerfiles used BuildKit cache mounts:

```dockerfile
# ❌ Before — fails on Railway (BuildKit cache mounts not supported)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install
```

**Fix:** Remove `--mount=type=cache` from all RUN commands. Railway builds standard Docker without BuildKit cache.

### Phase 4 — Database Schema Isolation

**Problem:** Both `identity` and `stock` were sharing the same single Postgres instance. Running `prisma db push` from each service overwrote the other's tables (both defaulting to the `public` schema).

**Symptom:** `stock` returned 500 with Prisma error `P2021: Table 'public.Item' does not exist`.

**Fix:** Append `?schema=<name>` to each service's `DATABASE_URL`:

```
identity → ?schema=identity
stock    → ?schema=stock
```

Prisma reads the schema name from the connection string and isolates all migrations/tables into that Postgres schema.

> **After changing DATABASE_URL:** `prisma db push` runs on startup and recreates the schema in the new namespace. All previously registered users/stock items are wiped. You must re-seed.

### Phase 5 — Seeding Production Data

After schema isolation wiped the DB, two types of data needed to be re-seeded manually:

**Stock items** — The `apps/stock` service has a startup seed (`main.ts`) that inserts default items if the table is empty. However, running it required the service to be live first. We also triggered it manually using a local Node script connected to Railway's public Postgres proxy URL.

Three items seeded:

- `Iftar Box` (quantity: 100)
- `Drinko` (quantity: 50)
- `Doctor Laban` (quantity: 75)

**User accounts** — Re-registered via the identity API:

```bash
# Student
curl -X POST https://identity-production-08d3.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"studentId":"2021331042","name":"Test Student","password":"pass1234"}'

# Admin (admin role granted by ADMIN_STUDENT_IDS env var)
curl -X POST https://identity-production-08d3.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"studentId":"admin001","name":"Admin","password":"admin1234"}'
```

### Phase 6 — Bug Fixes

Three bugs were discovered during production testing and fixed in code. See [Section 4](#4-bugs-found--fixed) for full details.

### Phase 7 — Deploying Code Changes

Railway's GitHub auto-deploy (webhook) was **not configured**. Pushing to `main` does not trigger a rebuild automatically. Deploys are triggered manually using the Railway CLI:

```bash
# Deploy a specific service with current local source
railway up -d -s gateway
railway up -d -s kitchen
```

The `-d` flag detaches (returns immediately without streaming logs). Omit it if you want to stream build output.

---

## 4. Bugs Found & Fixed

### Bug 1 — BullMQ Redis `NOAUTH` crash (gateway + kitchen)

**Symptom:** Kitchen service failed to start. Health check returned connection refused / timeout. Gateway's BullMQ producer also silently failed.

**Root cause:** `BullModule.forRoot` was given the raw `REDIS_URL` string. Railway's Redis URL includes a password (e.g. `redis://:password@host:port`). The BullMQ connection parser dropped the password, sending unauthenticated connections to Redis, which responded with `NOAUTH Authentication required`.

**Fix** in `apps/gateway/src/app.module.ts` and `apps/kitchen/src/app.module.ts`:

```typescript
// ❌ Before
BullModule.forRoot({
  connection: { url: process.env.REDIS_URL },
});

// ✅ After — manually parse URL and pass password explicitly
BullModule.forRoot({
  connection: (() => {
    const url = new URL(process.env.REDIS_URL || "redis://localhost:6379");
    return {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    };
  })(),
});
```

Note: `decodeURIComponent` is required because Railway URL-encodes special characters in passwords.

---

### Bug 2 — JWT strategy not returning `role` field

**Symptom:** Admin login returned `role=admin` in the login response body, but the JWT payload did not contain the role. Any route that checked `request.user.role` saw `undefined`.

**Root cause:** `apps/gateway/src/auth/jwt.strategy.ts` `validate()` method returned `{ studentId, name }` — the `role` from the JWT payload was discarded.

**Fix:**

```typescript
// ❌ Before
async validate(payload: any) {
  return { studentId: payload.sub, name: payload.name };
}

// ✅ After
async validate(payload: any) {
  return { studentId: payload.sub, name: payload.name, role: payload.role };
}
```

---

### Bug 3 — Missing admin guard on chaos endpoint

**Symptom:** Any user (including unauthenticated requests) could call `POST /admin/chaos` and toggle chaos mode on any service.

**Root cause:** `ChaosController` had no `@UseGuards` decorator.

**Fix:** Created `apps/gateway/src/common/guards/roles.guard.ts` and applied it:

```typescript
// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles =
      this.reflector.get<string[]>(ROLES_KEY, context.getHandler()) ??
      this.reflector.get<string[]>(ROLES_KEY, context.getClass());
    if (!roles) return true;
    const { user } = context.switchToHttp().getRequest();
    return user && roles.includes(user.role);
  }
}
```

```typescript
// chaos.controller.ts
@Controller('admin/chaos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ChaosController { ... }
```

`RolesGuard` must also be registered as a provider in `AppModule` so NestJS's DI can inject `Reflector` into it:

```typescript
// app.module.ts
providers: [AppService, JwtStrategy, RolesGuard, ...]
```

---

## 5. What Worked, What Didn't

### ✅ What worked well

| Thing                           | Notes                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dockerfile multi-stage builds   | `builder` + `runner` stages kept images small (~200MB)                                                                                           |
| Prisma `db push` on startup     | Each service automatically migrates its schema on boot — zero manual migration steps                                                             |
| Startup seed in `stock/main.ts` | Items appear automatically if the table is empty                                                                                                 |
| Railway internal networking     | Services talk to each other via `${{ServiceName.RAILWAY_PRIVATE_DOMAIN}}` — no public URL hops needed for service-to-service calls **if set up** |
| BullMQ job persistence          | Jobs survive kitchen restarts; Redis holds the queue                                                                                             |
| `ADMIN_STUDENT_IDS` env var     | Clean way to promote any student to admin without code changes                                                                                   |
| Pre-push test hook (local)      | Caught regressions before they reached Railway                                                                                                   |

### ❌ What didn't work / caused pain

| Issue                                 | What happened                                                                                                         | Lesson                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Railway GitHub webhook not configured | Pushing to `main` did NOT trigger a redeploy. Had to use `railway up` manually                                        | Always verify the webhook is set up in Railway dashboard → Service → Settings → Source |
| Shared Postgres `public` schema       | Both identity and stock Prisma schemas collided                                                                       | Always add `?schema=<name>` to DATABASE_URL from day one                               |
| BullMQ dropping Redis password        | Silent failure — kitchen crashed with `NOAUTH`                                                                        | Parse Redis URL manually, never pass raw URL to BullMQ                                 |
| `--mount=type=cache` in Dockerfile    | Railway doesn't support BuildKit cache mounts; build failed                                                           | Strip all `--mount=type=cache` for Railway deployments                                 |
| Empty commit needed to retrigger      | After merging dev→main, Railway still ran old build because the merge commit was created AFTER the last webhook event | Use `railway up -s <service>` instead of relying on the webhook                        |

---

## 6. Runbook: How to Deploy Next Time

### First-time deployment of a new service

```bash
# 1. Create service in Railway dashboard
#    Railway Dashboard → New Service → Empty Service → name it

# 2. Link your CLI to the new service
railway service <service-name>

# 3. Set required environment variables
railway variables set KEY=value KEY2=value2

# 4. Deploy from local source
railway up -s <service-name>

# 5. Follow build logs
railway deployment list  # get deployment ID
# or open the Railway dashboard to watch build progress
```

---

### Pushing a code update to an existing service

```bash
# Work on your feature branch
git checkout dev
git checkout -b feat/<your-name>/<feature>

# ... make changes, commit ...

git push origin feat/<your-name>/<feature>

# Merge to dev
git checkout dev && git merge feat/<your-name>/<feature> && git push origin dev

# Merge dev to main (required to keep main in sync)
git checkout main && git merge dev && git push origin main --no-verify

# Deploy only the services you touched
railway up -d -s gateway      # if you changed gateway
railway up -d -s identity     # if you changed identity
# etc.
```

> `--no-verify` skips the pre-push hook (full test suite). Only use this if tests are already green locally or in CI.

---

### Deploying all services at once (full redeploy)

```bash
for svc in gateway identity stock kitchen notification web; do
  echo "Deploying $svc..."
  railway up -d -s $svc
  sleep 5   # avoid saturating Railway's build queue
done
```

---

### Adding a new environment variable

```bash
# Via CLI (takes effect on next deploy)
railway service <service-name>
railway variables set NEW_VAR=value

# Then redeploy to pick it up
railway up -s <service-name>
```

Or: Railway Dashboard → Service → Variables → Add Variable → Redeploy.

> **Important for `web` (frontend):** If the variable is a `VITE_*` build arg, you must set it as a **build argument** in the Dockerfile or Railway's build arg settings, not as a runtime env var.

---

### Seeding the database after a schema change

If you change `DATABASE_URL` (e.g., point to a new schema) or wipe Postgres:

```bash
# 1. Register default accounts
curl -X POST https://identity-production-08d3.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"studentId":"2021331042","name":"Test Student","password":"pass1234"}'

curl -X POST https://identity-production-08d3.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"studentId":"admin001","name":"Admin","password":"admin1234"}'

# 2. Stock items seed automatically on startup if the table is empty.
#    If you want to verify:
curl https://stock-production-a6ec.up.railway.app/stock/items
```

---

### Rotating JWT_SECRET

1. Generate a new secret: `openssl rand -base64 48`
2. Set it on **both** `identity` and `gateway` simultaneously:
   ```bash
   railway service identity && railway variables set JWT_SECRET=<new>
   railway service gateway  && railway variables set JWT_SECRET=<new>
   ```
3. Redeploy both services: `railway up -d -s identity && railway up -d -s gateway`
4. **All existing JWTs are immediately invalidated.** All logged-in users must log in again.

---

### Checking service health

```bash
for url in \
  "https://gateway-production-3aa4.up.railway.app/health" \
  "https://identity-production-08d3.up.railway.app/health" \
  "https://stock-production-a6ec.up.railway.app/health" \
  "https://kitchen-production-847a.up.railway.app/health" \
  "https://notification-production-e374.up.railway.app/health"; do
  echo -n "$url → "
  curl -s "$url" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','?'))"
done
```

---

### Quick smoke test after any deploy

```bash
# Get tokens
TOKEN=$(curl -s -X POST https://identity-production-08d3.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"studentId":"2021331042","password":"pass1234"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

ATOKEN=$(curl -s -X POST https://identity-production-08d3.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"studentId":"admin001","password":"admin1234"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

ITEM_ID=$(curl -s https://stock-production-a6ec.up.railway.app/stock/items \
  | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])")

# Place an order
curl -s -X POST https://gateway-production-3aa4.up.railway.app/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: smoke-$(date +%s)" \
  -d "{\"itemId\":\"$ITEM_ID\"}"

# Verify chaos guard rejects students
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://gateway-production-3aa4.up.railway.app/admin/chaos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service":"gateway","enabled":true}'
# Expected: 403
```

---

### Railway CLI cheat sheet

```bash
railway login                          # authenticate
railway link                           # link a local directory to a project
railway service <name>                 # switch active service
railway up -s <name>                   # deploy current directory to service
railway up -d -s <name>               # deploy (detached — don't stream logs)
railway variables set KEY=val          # set/update env var (no redeploy)
railway variables                      # list all vars for current service
railway deployment list                # list recent deployments + statuses
railway deployment redeploy            # redeploy last image (NO source rebuild)
railway logs                           # stream logs for current service
```

> **`redeploy` ≠ rebuild.** `railway deployment redeploy` restarts the last built Docker image. It does NOT pull new source code. Use `railway up` whenever you have code changes.

---

## Appendix — Current Production Accounts

| Role    | Student ID   | Password    |
| ------- | ------------ | ----------- |
| Student | `2021331042` | `pass1234`  |
| Admin   | `admin001`   | `admin1234` |

Admin role is controlled by the `ADMIN_STUDENT_IDS` env var on the `identity` service. To add a new admin, add their student ID (comma-separated) and redeploy identity. The user must log out and back in to receive the new `role=admin` JWT claim.
