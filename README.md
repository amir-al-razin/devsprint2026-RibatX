# devsprint2026-RibatX

IUT Cafeteria ordering system — DevSprint 2026 hackathon project.  
Turborepo monorepo · 5 NestJS microservices · TanStack Start frontend · PostgreSQL · Redis · BullMQ

---

## Stack

| Layer         | Tech                                |
| ------------- | ----------------------------------- |
| Frontend      | TanStack Start + ShadCN (port 4000) |
| Gateway       | NestJS (port 3000)                  |
| Identity      | NestJS — JWT auth (port 3001)       |
| Stock         | NestJS — inventory (port 3002)      |
| Kitchen       | NestJS — BullMQ queue (port 3003)   |
| Notification  | NestJS — Socket.io (port 3004)      |
| Database      | PostgreSQL 15 — 5 logical DBs       |
| Cache / Queue | Redis                               |

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10 — `npm i -g pnpm`
- Docker + Docker Compose

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/amir-al-razin/devsprint2026-RibatX.git
cd devsprint2026-RibatX

# 2. Install all workspace dependencies
pnpm install

# 3. Copy env and fill in secrets
cp .env.example .env

# 4. Start infrastructure (Postgres + Redis)
docker compose up postgres redis -d

# 5. Build shared packages
pnpm turbo build --filter="./packages/*"

# 6. Start all services in dev mode
pnpm turbo dev
```

> **Note — iptables error on first Docker run:**  
> If you see `iptables: Chain 'DOCKER-ISOLATION-STAGE-2' does not exist`, run:
>
> ```bash
> sudo iptables -N DOCKER-ISOLATION-STAGE-2 && sudo iptables -N DOCKER-ISOLATION-STAGE-1
> ```
>
> Then retry `docker compose up`. This is a one-time fix per reboot on some Linux setups.

---

## Common Commands

```bash
# Run a single service
pnpm turbo dev --filter=@ribatx/identity

# Run only the web app
pnpm turbo dev --filter=@ribatx/web

# Type-check everything
pnpm turbo build

# Run all tests
pnpm turbo test

# Start full stack with Docker
docker compose up --build
```

---

## User Accounts

There is no self-registration UI. Accounts are created via the Identity API directly.

### Default demo accounts (seeded automatically)

| Role    | Student ID   | Password    | Notes                        |
| ------- | ------------ | ----------- | ---------------------------- |
| Student | `2021331042` | `pass1234`  | Regular student account      |
| Admin   | `admin001`   | `admin1234` | Access to `/admin` dashboard |

> Admin accounts are controlled by the `ADMIN_STUDENT_IDS` env var (comma-separated). Any student ID listed there receives `role=admin` in their JWT.

### Creating a new student account

```bash
curl -X POST https://identity-production-08d3.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"studentId":"2021331099","name":"New Student","password":"pass1234"}'
```

The account is immediately usable — log in at `http://localhost:4000`.

### Promoting a user to admin

Add their student ID to `ADMIN_STUDENT_IDS` in your `.env` file and restart the identity service:

```env
ADMIN_STUDENT_IDS=admin001,2021331099
```

```bash
docker compose restart identity
```

They must log out and log back in to get a fresh JWT with the `role=admin` claim.

---

## Contributing

We use a `main → dev → feat/<name>/<feature>` branch strategy.

```bash
# Set your git identity (first time only)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Husky git hooks are installed automatically when you run pnpm install.
# pre-commit: auto-formats staged files with Prettier
# pre-push:   runs the full test suite — push is blocked if any test fails

# Start a new feature
git checkout dev
git pull origin dev
git checkout -b feat/<your-name>/<short-description>

# After finishing — merge back to dev
git checkout dev
git pull origin dev
git merge feat/<your-name>/<short-description>
git push origin dev
```

Rules:

- **Never commit directly to `main` or `dev`**
- All work goes through feature branches
- `main` is updated only at demo-ready milestones
- See [docs/teamwork-guidelines.md](docs/teamwork-guidelines.md) for the full team split and checklist
