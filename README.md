# RibatX Cafeteria System — IUT DevSprint 2026

> **A resilient, microservices-based cafeteria ordering platform designed for high-concurrency events like Iftar.**

RibatX is a production-grade ordering system built with NestJS, TanStack Start, and PostgreSQL. It addresses the challenges of manual cafeteria coordination by providing a seamless, automated flow from order placement to real-time status notifications.

<img width="1901" height="960" alt="system-architecture" src="https://github.com/user-attachments/assets/5c89e5bb-3947-49a9-886b-1c17d380fd98" />


---

## 📖 Project Documentation

For a deep dive into the system's requirements, architecture, and technology choices, please refer to the following documentation:

- **[Project Summary](project-summary.md)**: A one-page overview for judges and reviewers.
- **[Requirement Analysis](requirement-analysis.md)**: Detailed breakdown of goals, functional/non-functional requirements, and use cases.
- **[System Architecture](system-architecture.md)**: Comprehensive description of microservices interaction, data flow, and security.
- **[Tools & Stack Report](tools-and-stack.md)**: Detailed analysis of the technologies used, justifications, and our **AI Usage Disclosure**.
- **[Architecture Diagram](assets/mermaid-diagrams.md)**: Visual representation of the system using Mermaid charts.

---

## 🚀 Key Features

- **Asynchronous Fulfillment**: Orders are processed via **BullMQ** to ensure system stability during traffic spikes.
- **Strict Inventory Integrity**: **Optimistic locking** in the Stock service (PostgreSQL) prevents overselling.
- **Real-time Visibility**: Live order tracking powered by **Socket.io** WebSockets.
- **Resilience Engineering**: Built-in **Idempotency Guard** and **Chaos Mode** for testing system failure handling.
- **Type-Safe Fullstack**: Unified TypeScript monorepo using **Turborepo** for shared data contracts.

---

## 🛠️ Quick Start

### credentials (admin)
- id/name: admin001
- pass: admin1234
### creating user (admins are specified in .env by name/id after user creation)
```bash
curl -X POST https://identity-production-08d3.up.railway.app/auth/register \                                       
  -H "Content-Type: application/json" \
  -d '{"studentId":"2021331099","name":"New Student","password":"pass1234"}'
```
localhost
```bash
curl -X POST https://localhost:3001/auth/register \                                       
  -H "Content-Type: application/json" \
  -d '{"studentId":"2021331099","name":"New Student","password":"pass1234"}'
```

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10
- Docker + Docker Compose

### Fast Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env

# 3. Start infrastructure (Postgres + Redis)
docker compose up postgres redis -d

# 4. Initialize and start dev services
pnpm turbo build --filter="./packages/*"
pnpm turbo dev
```

Visit the app at `http://localhost:4000`.

---

## 🤖 AI Usage Disclosure

This project was developed with the assistance of:

- **GitHub Copilot**: For rapid boilerplate generation and test suite expansion.
- **Google Gemini**: For architectural design collaboration, resilience strategy refinement, and technical documentation.

---

## 👥 The Team

Developed by **RibatX** for the **IUT DevSprint 2026 Hackathon**.

See [docs/teamwork-guidelines.md](docs/teamwork-guidelines.md) for team members, detailed team contributions and split.
