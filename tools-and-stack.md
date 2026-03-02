# Tools & Stack Report

## 1. Overview

The RibatX Cafeteria System's technology stack was chosen to prioritize **developer velocity, type safety, and system resilience**. By using a unified language (TypeScript) across the entire monorepo, we ensure seamless data sharing and contract enforcement between the TanStack Start frontend and NestJS microservices. The architecture leverages industry-standard tools like BullMQ and Redis to handle high-concurrency ordering scenarios, ensuring the system remains responsive even under heavy load.

## 2. Technology Stack Table

| Layer           | Technology        | Version | Purpose               | Why Chosen                                                                             |
| --------------- | ----------------- | ------- | --------------------- | -------------------------------------------------------------------------------------- |
| Workspace       | Turborepo         | latest  | Monorepo Management   | High-performance build system with remote caching capabilities.                        |
| Package Manager | pnpm              | 10.x    | Dependency Management | Efficient disk usage and fast installation in a multi-service environment.             |
| Language        | TypeScript        | 5.4+    | Type Safety           | Ensures end-to-end type safety between frontend and backend via shared types.          |
| Frontend        | TanStack Start    | latest  | Web Application       | Provides full-stack features like SSR, type-safe routing, and efficient data loading.  |
| UI              | ShadCN / Tailwind | -       | Styling & Components  | Rapid UI development with accessible, highly customizable components.                  |
| Backend         | NestJS            | 11.x    | Microservices         | Modular architecture with built-in support for microservices and dependency injection. |
| Database        | PostgreSQL        | 15      | Primary Persistence   | Reliable relational database with robust support for complex queries and transactions. |
| ORM             | Prisma            | -       | Data Modeling         | Type-safe database access with an intuitive schema definition and migration system.    |
| Caching         | Redis             | 7.x     | Cache & Lock          | Low-latency storage for stock levels, idempotency keys, and chaos state.               |
| Messaging       | BullMQ            | -       | Background Jobs       | Reliable, Redis-backed queue system for asynchronous kitchen order processing.         |
| Real-time       | Socket.io         | -       | Live Updates          | Enables bi-directional communication for instant order status notifications.           |
| Documentation   | Mermaid           | -       | Architecture Visuals  | Renderable, version-controlled diagrams for architectural clarity.                     |
| CI/CD           | GitHub Actions    | -       | Automated Pipelines   | Ensures code quality through automated builds, linting, and testing on every push.     |
| Git Hooks       | Husky             | 9.x     | Pre-commit Checks     | Enforces code formatting and quality standards locally before code reaches the repo.   |
| Deployment      | Railway           | -       | Cloud Hosting         | Provides a reliable, scalable environment for hosting the microservices and databases. |

## 3. Core Technologies (Detailed)

### NestJS (Microservices)

NestJS serves as the backbone of our backend ecosystem. We chose it because it provides a highly structured environment that is essential for maintaining five distinct microservices. Its modularity allows us to share common logic (like metrics interceptors and role guards) across services while keeping domain-specific logic (like stock reservation or kitchen processing) isolated.

### TanStack Start

For the frontend, TanStack Start was selected over traditional SPA frameworks to gain the benefits of Server-Side Rendering (SSR) and built-in type-safe routing. This is critical for the "Order Tracking" dashboard, where we need to combine static data (order details) with dynamic updates (WebSocket events) seamlessly.

### BullMQ & Redis

To solve the problem of high-load ordering, we implemented BullMQ. This ensures that even if the Kitchen service experiences a spike in traffic, orders are safely queued in Redis and processed as workers become available, preventing system crashes and data loss.

### Prisma (Optimistic Locking)

Consistency is paramount in cafeteria stock. We use Prisma's `updateMany` combined with a `version` column to implement optimistic locking. This allows multiple students to place orders simultaneously while guaranteeing that the stock count never becomes inaccurate due to race conditions.

## 4. Development & Tooling

- **CI/CD Pipeline**: **GitHub Actions** automates our integration workflow, running linting, type-checking, and the full test suite on push to `main` and `dev` branches.
- **Git Hooks**: **Husky** handles pre-commit and pre-push hooks, ensuring that all code is formatted with Prettier and passes unit tests locally, preventing broken builds from being pushed.
- **Testing**: Jest is used for unit and E2E testing, specifically for validating the complex stock reservation logic.
- **Containerization**: Docker Compose allows for "one-command" environment setup, including all five services, PostgreSQL, and Redis.

## 5. AI Usage Disclosure

In alignment with the hackathon's transparency policy, we disclose the use of the following AI tools during the project's development:

- **GitHub Copilot**: Extensively used for generating boilerplate code, repetitive test cases, and providing intelligent auto-completion within the NestJS and TanStack frameworks.
- **Google Gemini**: Utilized as a strategic architectural collaborator. Gemini assisted in designing the distributed tracing logic (`traceId`), refining the optimistic locking strategy in the Stock service, and structuring the professional documentation seen in this report.
- **Impact**: AI tools significantly reduced development time for infrastructure setup, allowing the team to focus on core business logic and system resilience features.

## 6. Third-Party Services & Integrations

- **Socket.io**: Integrated into the Notification service to push real-time updates to the web client.
- **Railway**: Used for cloud hosting during development and testing phases, providing a seamless deployment experience for our microservices.
