# System Visuals

<i>(in Mermaid)</i>

## 1. System Architecture & Data Flow

This diagram illustrates the microservices orchestration, communication protocols, and multi-layered persistence strategy of the RibatX Cafeteria System.

```mermaid
graph TD
    subgraph Client_Layer [Frontend Layer]
        Web[TanStack Start Web App]
    end

    subgraph API_Layer [Gateway & Auth]
        Gateway[ribatx/gateway]
        Identity[ribatx/identity]
    end

    subgraph Service_Layer [Core Services]
        Stock[ribatx/stock]
        Kitchen[ribatx/kitchen - BullMQ Worker]
        Notify[ribatx/notification]
    end

    subgraph Persistence_Layer [Data & Queue]
        PG[(PostgreSQL 15)]
        Redis[(Redis / BullMQ)]
    end

    %% Interactions
    Web -- "HTTPS / JWT" --> Gateway
    Web -- "HTTPS / JWT" --> Identity
    Web -- "WebSockets" <--> Notify

    Gateway -- "Internal REST" --> Stock
    Gateway -- "Job Push" --> Redis
    Gateway -- "Read/Write" --> Redis

    Identity -- "SQL" --> PG
    Stock -- "SQL (Optimistic Lock)" --> PG
    Stock -- "Cache Sync" --> Redis

    Redis -- "Job Pull" --> Kitchen
    Kitchen -- "Status Update" --> Notify
    Notify -- "Status Patch" --> Gateway
    Gateway -- "SQL" --> PG
```

## 2. Technology Stack Breakdown

A high-level view of the core technologies powering each layer of the RibatX ecosystem.

```mermaid
graph TD
    subgraph DevOps [DevOps & Deployment]
        Husky[Husky Pre-commit Hooks]
        GHA[GitHub Actions CI/CD]
        Railway[Railway Cloud Hosting]
    end

    subgraph Frontend [Frontend Layer]
        TSS[TanStack Start]
        SC[ShadCN UI]
        TW[Tailwind CSS]
    end

    subgraph Backend [Backend Layer]
        NEST[NestJS Microservices]
        TURBO[Turborepo]
        PNPM[pnpm Workspaces]
    end

    subgraph Infra [Infrastructure & Logic]
        DOCKER[Docker Compose]
        BULL[BullMQ]
        PRISMA[Prisma ORM]
    end

    subgraph Storage [Data Persistence]
        PSQL[PostgreSQL]
        RED[Redis]
    end

    %% Deployment Flow
    Husky --> GHA
    GHA --> Railway
    Railway -.-> TSS
    Railway -.-> NEST

    %% Application Logic Flow
    TSS --- NEST
    NEST --- PRISMA
    PRISMA --- PSQL
    NEST --- BULL
    BULL --- RED
    DOCKER -.-> PSQL
    DOCKER -.-> RED
```
