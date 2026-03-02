# Pending Fixes

Branch convention: `feat/amir-al-razin/<fix-name>` branched from `dev`.  
Each fix gets its own branch → PR → manual merge on GitHub. Never merge locally.

---

## Fix 1 — Rate Limit Guard Bypass

**File:** `apps/identity/src/common/guards/rate-limit.guard.ts`

|                            | Current                                                         | After Fix                                                    |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Empty body request         | `if (!studentId) { return true; }` — bypasses all rate limiting | Falls back to IP: `studentId ?? \`ip:${request.ip}\``        |
| Attacker with no studentId | Can hammer login endpoint infinitely                            | Rate-limited by IP, gets 429 after 3 attempts                |
| Identifier key             | `rate_limit:login:<studentId>` only                             | `rate_limit:login:<studentId>` or `rate_limit:login:ip:<ip>` |

**Test to verify before pushing:**

```bash
# Flush Redis, then send 4 requests with empty body — 4th must be 429
docker exec ribatx_redis redis-cli FLUSHDB
for i in 1 2 3 4; do
  curl -s --max-time 5 -o /dev/null -w "Request $i: HTTP %{http_code}\n" \
    -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" -d '{}'
done
# Expected: 400 400 400 429
```

---

## Fix 2 — Health Endpoint `service: null`

**Files:** all 5 health controllers

- `apps/gateway/src/health/`
- `apps/identity/src/health/`
- `apps/stock/src/health/`
- `apps/kitchen/src/health/`
- `apps/notification/src/health/`

|                             | Current                                               | After Fix                                       |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| `GET /health` response      | `{ "status": "ok", "service": null, ... }`            | `{ "status": "ok", "service": "gateway", ... }` |
| Admin dashboard health grid | Shows service name as null/empty                      | Shows correct service name                      |
| Debuggability               | Can't tell which service a health response belongs to | Clear service identity in every response        |

**Test to verify:**

```bash
for PORT in 3000 3001 3002 3003 3004; do
  curl -s http://localhost:$PORT/health | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Port {$PORT}: service={d.get(\"service\")}')"
done
# Expected: each line shows the correct service name, not null
```

---

## Fix 3 — Idempotency Guard Returns 409 Instead of 200

**Files:**

- `apps/gateway/src/common/guards/idempotency.guard.ts`
- `apps/gateway/src/orders/orders.service.ts`

|                                       | Current                                               | After Fix                                                                                               |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Duplicate `X-Idempotency-Key` request | Guard throws `ConflictException` → HTTP **409** error | Guard reads cached response from Redis → HTTP **200** with original order data                          |
| Redis value after order creation      | Stays as `{ status: 'PROCESSING' }` forever           | `orders.service.ts` overwrites it with `{ orderId, status: 'PENDING', ... }` after `kitchenQueue.add()` |
| Client retry behaviour                | Crashes with a 409 conflict error                     | Receives original response idempotently — safe to retry                                                 |
| E2E test result                       | Reports HTTP 409 (incorrectly marked as pass)         | HTTP 200 with original orderId                                                                          |

**Test to verify:**

```bash
# Place an order twice with the same idempotency key — both must return 200 with same orderId
KEY="test-idem-$(date +%s)"
R1=$(curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" \
  -H "X-Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"itemId":"<id>","quantity":1}')
R2=$(curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" \
  -H "X-Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"itemId":"<id>","quantity":1}')
echo "R1: $R1"
echo "R2: $R2"
# Expected: both return HTTP 200, both have the same orderId, stock not deducted twice
```

---

## Fix 4 — Missing `GET /orders/:id` Endpoint

**File:** `apps/gateway/src/orders/orders.controller.ts`

|                         | Current                                            | After Fix                                           |
| ----------------------- | -------------------------------------------------- | --------------------------------------------------- |
| Order status lookup     | No endpoint exists — `GET /orders/:id` returns 404 | Returns `{ orderId, status, ... }` from Redis cache |
| Frontend order tracking | Cannot poll for order status by ID                 | Can poll `GET /orders/:id` to track order progress  |
| Available routes        | `POST /orders` only                                | `POST /orders` + `GET /orders/:id`                  |

**Test to verify:**

```bash
# Place an order, get the orderId, then look it up
ORDER=$(curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"itemId":"<id>","quantity":1}')
ID=$(echo $ORDER | python3 -c "import json,sys; print(json.load(sys.stdin)['orderId'])")
curl -s http://localhost:3000/orders/$ID -H "Authorization: Bearer <token>"
# Expected: HTTP 200 with order details, not 404
```

---

## Fix 5 — Docker Compose Missing NestJS Healthchecks

**File:** `docker-compose.yml`

|                                             | Current                                                                       | After Fix                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ | --- | ------- |
| gateway/identity/stock/kitchen/notification | No `healthcheck:` block                                                       | `wget -qO- http://localhost:<PORT>/health              |     | exit 1` |
| `depends_on` reliability                    | Services start before NestJS is ready, causing connection errors on cold boot | Dependent services wait until health endpoint responds |
| `docker ps` output                          | Shows `Up X seconds` with no health indicator                                 | Shows `Up X seconds (healthy)`                         |

**Healthcheck to add to each NestJS service in docker-compose.yml:**

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:<PORT>/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Ports: gateway=3000, identity=3001, stock=3002, kitchen=3003, notification=3004

---

## Fix 6 — Gateway Has No Order Database Persistence (Largest Change)

**Files to create/modify:**

- `apps/gateway/prisma/schema.prisma` _(create)_
- `apps/gateway/src/orders/orders.service.ts` _(modify)_
- `apps/gateway/Dockerfile` _(modify CMD)_

|                                 | Current                                           | After Fix                                     |
| ------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Order storage                   | Orders only exist in Redis (volatile, no history) | Persisted in `order_db` PostgreSQL via Prisma |
| `GET /orders/:id` backing store | Redis only (lost on restart)                      | PostgreSQL (durable)                          |
| Admin order history             | Not possible                                      | Queryable from DB                             |
| Gateway Dockerfile CMD          | `node dist/main.js`                               | `npx prisma db push ... && node dist/main.js` |
| `DATABASE_URL` env var          | Set in docker-compose.yml but completely unused   | Used by PrismaService to persist orders       |

**Note:** This is the largest fix (~2 hours). Do it last, in its own branch, after all other fixes are merged.
