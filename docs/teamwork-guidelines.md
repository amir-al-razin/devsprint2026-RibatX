# Teamwork Guidelines

> Remote, async hackathon rules. Read once. Follow always.

---

## Team Split & Ownership

### Why service ownership — not layer split

Splitting by "you do backend, I do frontend" or "you write tests, I write code" creates bottlenecks and dependency waits. Splitting by **service** means each person has a completely isolated directory to work in. Conflicts become structurally impossible — two people simply never edit the same files.

### Recommended Split (2 people, 1 frontend owner)

| Person | Owns | Why grouped this way |
|---|---|---|
| **A — Core Transactions** | `apps/identity` + `apps/stock` | Auth is independent. Stock is the tightest, most critical logic (optimistic locking). Keeping both small services with one owner avoids partial implementations. |
| **B — Async Pipeline** | `apps/gateway` + `apps/kitchen` + `apps/notification` | These three form one continuous flow: Gateway enqueues → Kitchen processes → Notification broadcasts. One person owning the whole pipeline eliminates contract mismatches mid-chain. |
| **C / shared** | `apps/web` + `packages/types` + `infra/` + CI/CD | If 3 people: Person C owns the frontend and infrastructure.|

### If you are 3 people

| Person | Owns |
|---|---|
| A | `apps/identity` + `apps/stock` + unit tests for Stock |
| B | `apps/gateway` + `apps/kitchen` + unit tests for Gateway |
| C | `apps/notification` + `apps/web` + `infra/` + CI/CD + Railway deployment |

### Dependency order — who must finish first

Services have a build-order dependency. Work in parallel only after the *contract* (types) is agreed, not after the *implementation* is done:

```
Day 1:  Everyone  →  packages/types defined (contracts agreed before code starts)
Day 2:  A builds Identity  |  B stubs Gateway (JWT guard only, no Stock calls yet)
Day 3:  A builds Stock     |  B adds cache layer + wires Gateway → Stock (A's /reserve contract)
Day 4:  B builds Kitchen + Notification  (A is writing tests, reviewing B's PRs)
Day 5:  A + B write tests, add /health + /metrics  |  C starts frontend with mocked API responses
Day 6:  C wires real API calls  |  A + B fix integration bugs surfaced by C
Day 7:  Everyone → integration, chaos testing, deployment
```

The frontend (Person C / whoever owns `apps/web`) can build and style the entire UI using the types from `packages/types` and mocked data from Day 1 onwards. They do not need a running backend until Day 6.

### How to learn without breaking each other's work

The problem with "I also want to build the Gateway" is not motivation — it is merge conflicts and half-finished features. The compromise:

- **Code reviews are mandatory, not optional.** Reading and commenting on every PR is how the team learns the whole codebase.
- **Pair on the hard parts.** Schedule a live session for optimistic locking (Day 3) and BullMQ setup (Day 4). One person drives, both learn.
- **Rotate infrastructure tasks.** CI/CD, Dockerfile writing, and Docker Compose are quick tasks anyone can pick up when their service is waiting on a dependency.
- **After the hackathon**, swap ownership and refactor each other's service. Best learning happens after the pressure is gone.

---

## 1. Branch Strategy

- `main` — deployable at all times. **Never push directly.**
- `dev` — integration branch. All features merge here first.
- Feature branches: `feat/<your-name>/<short-description>`
  - e.g. `feat/amir/stock-optimistic-lock`, `feat/sara/student-ui-login`
- One feature = one branch = one PR. Keep PRs small and focused.

---

## 2. Before You Start Any Feature

```
1. Pull latest dev:        git checkout dev && git pull origin dev
2. Cut your branch:        git checkout -b feat/<name>/<feature>
3. Check the PRD:          Is this feature fully specced? If not, clarify in Discord first.
4. Claim it:               Move the task to "In Progress" on the shared board (GitHub Projects).
```

Do not start building something that isn't on the board. Do not build two things at once.

---

## 3. Where Things Live

| What | Where |
|---|---|
| Shared TS interfaces & enums | `packages/types/src/index.ts` — the **only** source of truth |
| Zod schemas (frontend validation) | `packages/types/src/schemas.ts` |
| Shared tsconfig | `packages/tsconfig/base.json` |
| Service-specific types (DB shapes, internal) | Inside that service only — do not export these |
| Environment variables | `.env.example` at root. Actual `.env` files are gitignored. |
| Secrets | **Nowhere in the repo.** Use Railway env dashboard or local `.env`. |

**Rule:** If two services or the frontend both need a type, it belongs in `packages/types`. If only one service needs it, keep it local.

---

## 4. API Contract Rule

Before implementing a new endpoint:

1. Define the request/response types in `packages/types` first.
2. Announce the contract in Discord: _"Gateway POST /orders will accept `CreateOrderDto` and return `OrderResponseDto`."_
3. Merge the types PR before building the implementation.

This ensures the frontend can mock and build in parallel without waiting for the backend to be done.

---

## 5. Pre-Commit Checklist

Run this mentally before every `git commit`:

```
[ ] My code compiles with no TypeScript errors (`pnpm tsc --noEmit`)
[ ] I haven't hardcoded any URL, secret, or port — all come from env vars
[ ] I haven't modified another service's code without telling the owner
[ ] I haven't changed a shared type without updating all usages
[ ] My feature has at least a smoke test (or a note explaining why it can't)
[ ] I haven't committed a .env file (check with: git status)
[ ] My branch is rebased on latest dev (no stale conflicts hiding)
```

---

## 6. Pre-Push / Pre-PR Checklist

```
[ ] pnpm install — no lockfile conflicts
[ ] pnpm turbo build --filter=<my-app> — builds cleanly
[ ] pnpm turbo test --filter=<my-app> — all tests pass
[ ] docker compose up — the system still starts (spot-check your service)
[ ] PR description answers: What does this do? How do I test it?
[ ] PR is targeting `dev`, not `main`
```

---

## 7. Shared Files — Touch With Care

These files affect everyone. Always announce in Discord before editing:

- `docker-compose.yml`
- `turbo.json`
- `packages/types/src/index.ts`
- `packages/tsconfig/base.json`
- `infra/postgres/init.sql`
- `.github/workflows/ci.yml`
- Root `package.json`

If you must change one: do it in an isolated PR, tag everyone, and merge only after a thumbs-up.

---

## 8. Environment Variables

- Add any new variable to `.env.example` with a placeholder value in the same commit it is used.
- Document it in the PR description.
- Never default to a hardcoded fallback in production code:
  ```ts
  // ❌ Bad
  const secret = process.env.JWT_SECRET ?? 'mysecret';

  // ✅ Good
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  const secret = process.env.JWT_SECRET;
  ```

---

## 9. Communication Rules

- **Blocking on someone?** Ping directly, don't wait more than 2 hours silently.
- **Changing a shared contract?** Always announce _before_ committing, not after.
- **Found a bug in someone else's service?** Open a GitHub Issue, don't fix it yourself.
- **Going offline for >3 hours?** Leave a note: what you finished, what's in progress, what's blocked.

---

## 10. The Non-Negotiables

These are the rules that protect the demo. Breaking any of these breaks the submission:

1. `docker compose up` must always work on `main`.
2. `pnpm turbo test` must always be green on `main`.
3. No service may call another service's **database** directly — only via HTTP.
4. Every PR to `dev` requires at least one other person to read it before merging.
5. The night before submission: freeze `dev`, do a clean `docker compose up --build` from scratch on a fresh clone, and walk the full demo flow once.
