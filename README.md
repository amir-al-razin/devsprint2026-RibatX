# devsprint2026-RibatX

IUT Cafeteria ordering system — DevSprint 2026 hackathon project.  
Turborepo monorepo · 5 NestJS microservices · TanStack Start frontend · PostgreSQL · Redis · BullMQ

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | TanStack Start + ShadCN (port 4000) |
| Gateway | NestJS (port 3000) |
| Identity | NestJS — JWT auth (port 3001) |
| Stock | NestJS — inventory (port 3002) |
| Kitchen | NestJS — BullMQ queue (port 3003) |
| Notification | NestJS — Socket.io (port 3004) |
| Database | PostgreSQL 15 — 5 logical DBs |
| Cache / Queue | Redis |

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
> ```bash
> sudo iptables -N DOCKER-ISOLATION-STAGE-2 && sudo iptables -N DOCKER-ISOLATION-STAGE-1
> ```
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

## Contributing

We use a `main → dev → feat/<name>/<feature>` branch strategy.

```bash
# Set your git identity (first time only)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

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
