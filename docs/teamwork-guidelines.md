# Teamwork Guidelines

> Remote, async hackathon rules. Read once. Follow always.

---

## Team Split & Ownership

### Why service ownership — not layer split

Splitting by "you do backend, I do frontend" or "you write tests, I write code" creates bottlenecks and dependency waits. Splitting by **service** means each person has a completely isolated directory to work in. Conflicts become structurally impossible — two people simply never edit the same files.

### Recommended Split (2 people, 1 frontend owner)

| Person                    | Owns                                                  | Why grouped this way                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A — Core Transactions** | `apps/identity` + `apps/stock`                        | Auth is independent. Stock is the tightest, most critical logic (optimistic locking). Keeping both small services with one owner avoids partial implementations.                     |
| **B — Async Pipeline**    | `apps/gateway` + `apps/kitchen` + `apps/notification` | These three form one continuous flow: Gateway enqueues → Kitchen processes → Notification broadcasts. One person owning the whole pipeline eliminates contract mismatches mid-chain. |
| **C / shared**            | `apps/web` + `packages/types` + `infra/` + CI/CD      | If 3 people: Person C owns the frontend and infrastructure.                                                                                                                          |

### If you are 3 people

| Person | Owns                                                                     |
| ------ | ------------------------------------------------------------------------ |
| A      | `apps/identity` + `apps/stock` + unit tests for Stock                    |
| B      | `apps/gateway` + `apps/kitchen` + unit tests for Gateway                 |
| C      | `apps/notification` + `apps/web` + `infra/` + CI/CD + Railway deployment |

### Dependency order — who must finish first

Services have a build-order dependency. Work in parallel only after the _contract_ (types) is agreed, not after the _implementation_ is done:

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

## 2. GitHub Workflow — Full Command Reference

This section covers the exact commands for every stage of a typical feature. Save this and follow it every time.

### Starting a new feature

```bash
# 1. Make sure you're on dev and fully up to date
git checkout dev
git pull origin dev

# 2. Cut your feature branch from the latest dev
git checkout -b feat/<your-name>/<short-description>
# e.g.  git checkout -b feat/amir/stock-optimistic-lock

# 3. Push it to remote immediately so others can see it exists
git push -u origin feat/<your-name>/<short-description>
```

---

### While working — staying in sync with dev

Others will keep merging into `dev` while you work. Sync at the start of each session so conflicts stay small:

```bash
# Pull the latest changes from dev into your feature branch
git fetch origin
git merge origin/dev

# If there are conflicts, Git will tell you which files.
# Open them, fix the conflict markers (<<<<< / ===== / >>>>>),
# then mark them resolved and continue:
git add <conflicted-file>
git merge --continue
```

> **Why `merge` not `rebase` here?** Rebase rewrites history and force-pushes, which breaks anyone else who has checked out your branch. Merge is safer for shared feature branches.

---

### Committing your work

```bash
# Stage specific files (preferred over git add .)
git add apps/your-service/src/feature.ts

# Commit — Husky will auto-format staged files with Prettier
git commit -m "feat(service): short description of what changed"

# Push — Husky runs pnpm turbo test before the push goes through
git push
```

**Commit message format:** `type(scope): description`

- `feat(stock): add optimistic locking to reserve endpoint`
- `fix(gateway): handle 409 from stock service correctly`
- `test(gateway): add unit tests for idempotency guard`
- `docs(readme): add local dev setup steps`

---

### Opening a Pull Request

```bash
# One final sync with dev before opening the PR
git fetch origin
git merge origin/dev

# Run full test suite locally first
pnpm turbo test

# Then push
git push
```

Open the PR on GitHub: **base: `dev`** ← compare: `feat/<name>/<feature>`

PR description must answer:

1. What does this change do?
2. How do I test it manually?
3. Are there any breaking changes to shared types or contracts?

---

### After your PR is merged

```bash
# Switch back to dev and pull the merge
git checkout dev
git pull origin dev

# Delete your local feature branch (it's now in dev)
git branch -d feat/<your-name>/<short-description>

# Start your next feature from the fresh dev
git checkout -b feat/<your-name>/<next-feature>
git push -u origin feat/<your-name>/<next-feature>
```

---

### Quick-reference cheatsheet

| Situation                       | Command                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| Start a new feature             | `git checkout dev && git pull origin dev && git checkout -b feat/<name>/<feature>` |
| Sync with dev mid-feature       | `git fetch origin && git merge origin/dev`                                         |
| Check what's different from dev | `git log origin/dev..HEAD --oneline`                                               |
| See what files you changed      | `git diff origin/dev --name-only`                                                  |
| Undo last commit (keep changes) | `git reset --soft HEAD~1`                                                          |
| Discard all uncommitted changes | `git restore .`                                                                    |
| See all branches                | `git branch -a`                                                                    |
| Delete a merged local branch    | `git branch -d feat/<name>/<feature>`                                              |

---

## 3. Before You Start Any Feature

```
1. Pull latest dev:        git checkout dev && git pull origin dev
2. Cut your branch:        git checkout -b feat/<name>/<feature>
3. Check the PRD:          Is this feature fully specced? If not, clarify in Discord first.
4. Claim it:               Move the task to "In Progress" on the shared board (GitHub Projects).
```

Do not start building something that isn't on the board. Do not build two things at once.

---

## 4. Where Things Live

| What                                         | Where                                                               |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Shared TS interfaces & enums                 | `packages/types/src/index.ts` — the **only** source of truth        |
| Zod schemas (frontend validation)            | `packages/types/src/schemas.ts`                                     |
| Shared tsconfig                              | `packages/tsconfig/base.json`                                       |
| Service-specific types (DB shapes, internal) | Inside that service only — do not export these                      |
| Environment variables                        | `.env.example` at root. Actual `.env` files are gitignored.         |
| Secrets                                      | **Nowhere in the repo.** Use Railway env dashboard or local `.env`. |

**Rule:** If two services or the frontend both need a type, it belongs in `packages/types`. If only one service needs it, keep it local.

---

## 5. API Contract Rule

Before implementing a new endpoint:

1. Define the request/response types in `packages/types` first.
2. Announce the contract in Discord: _"Gateway POST /orders will accept `CreateOrderDto` and return `OrderResponseDto`."_
3. Merge the types PR before building the implementation.

This ensures the frontend can mock and build in parallel without waiting for the backend to be done.

---

## 6. Pre-Commit Checklist

> **Husky runs automatically on every `git commit`** — it will auto-format your staged files with Prettier. If the hook fails, your commit is blocked.

Before committing, also verify manually:

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

## 7. Pre-Push / Pre-PR Checklist

> **Husky runs automatically on every `git push`** — it runs the full test suite (`pnpm turbo test`). If any test fails, the push is blocked. Fix the tests before retrying.

Additionally verify before opening a PR:

```
[ ] pnpm install — no lockfile conflicts
[ ] pnpm turbo build --filter=<my-app> — builds cleanly
[ ] docker compose up — the system still starts (spot-check your service)
[ ] PR description answers: What does this do? How do I test it?
[ ] PR is targeting `dev`, not `main`
```

---

## 8. Shared Files — Touch With Care

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

## 9. Environment Variables

- Add any new variable to `.env.example` with a placeholder value in the same commit it is used.
- Document it in the PR description.
- Never default to a hardcoded fallback in production code:

  ```ts
  // ❌ Bad
  const secret = process.env.JWT_SECRET ?? "mysecret";

  // ✅ Good
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  const secret = process.env.JWT_SECRET;
  ```

---

## 10. Testing Strategy

**Libraries:** Jest + `@nestjs/testing` + `supertest` for all NestJS services. Vitest for `apps/web`. Both are already installed — no setup needed.

### Rule: test your own service, mock everything else

Unit tests must never touch a real database, Redis, or HTTP endpoint. Use Jest mocks to replace dependencies:

```ts
// Example: apps/identity/src/auth/auth.service.spec.ts
const mockPrisma = { student: { findUnique: jest.fn(), create: jest.fn() } };
const mockRedis = { incr: jest.fn(), expire: jest.fn() };
const mockJwt = { sign: jest.fn().mockReturnValue("token") };

const module = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: JwtService, useValue: mockJwt },
    { provide: "REDIS_CLIENT", useValue: mockRedis },
  ],
}).compile();
```

### What to test per service (minimum required)

| Service        | Required spec file                          | Must cover                                                                                               |
| -------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `identity`     | `auth/auth.service.spec.ts`                 | login happy path, wrong password → 401, 4th attempt → 429                                                |
| `gateway`      | `orders/orders.service.spec.ts`             | no token → 401, cache hit stock=0 → 409, duplicate idempotency key → cached response                     |
| `stock`        | `stock/stock.service.spec.ts`               | successful reserve decrements qty+version, version conflict after 3 retries → 409, qty=0 → immediate 409 |
| `kitchen`      | `kitchen/kitchen.processor.spec.ts`         | job processes and calls Notification Hub, job failure retries                                            |
| `notification` | `notification/notification.service.spec.ts` | socket emits to correct room, PATCH /notify triggers broadcast                                           |

### How to run tests while building

```bash
# Only your service, re-runs on save
cd apps/identity
pnpm test:watch

# Only your service, single run
pnpm turbo test --filter=@ribatx/identity

# All services (Husky runs this automatically on git push)
pnpm turbo test
```

### When to write the test

Write the test **in the same PR as the feature** — not after, not in a cleanup PR. If a spec file doesn't exist for your feature, CI will still pass, but the PR reviewer should reject it.

---

## 11. Communication Rules

- **Blocking on someone?** Ping directly, don't wait more than 2 hours silently.
- **Changing a shared contract?** Always announce _before_ committing, not after.
- **Found a bug in someone else's service?** Open a GitHub Issue, don't fix it yourself.
- **Going offline for >3 hours?** Leave a note: what you finished, what's in progress, what's blocked.

---

## 12. The Non-Negotiables

These are the rules that protect the demo. Breaking any of these breaks the submission:

1. `docker compose up` must always work on `main`.
2. `pnpm turbo test` must always be green on `main`.
3. No service may call another service's **database** directly — only via HTTP.
4. Every PR to `dev` requires at least one other person to read it before merging.
5. The night before submission: freeze `dev`, do a clean `docker compose up --build` from scratch on a fresh clone, and walk the full demo flow once.
