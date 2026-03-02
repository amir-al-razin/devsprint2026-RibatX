# Project Summary

## Problem in One Line

Traditional cafeteria ordering is slow and uncoordinated, especially during high-demand events like Iftar.

## Solution in One Line

A resilient, microservices-driven platform that automates the lifecycle from order placement to terminal delivery with real-time tracking.

## Data Flow Summary

1.  **Student Authenticates**: Logs into the TanStack Start frontend via the Identity service (JWT).
2.  **Order Placement**: Student selects an "Iftar Box"; Gateway service receives the request with an `X-Idempotency-Key` for reliability.
3.  **Stock Verification**: Gateway calls Stock Service; Prisma performs an optimistic lock update in PostgreSQL to reserve the item securely.
4.  **Queue Hand-off**: Gateway adds the verified order to the `kitchen-orders` BullMQ queue (Redis-backed).
5.  **Kitchen Processing**: Kitchen Worker picks up the job, marks the order "In Kitchen," and simulates cooking.
6.  **Real-time Update**: Notification service emits a WebSocket event; student’s UI updates instantly with a "READY" status.
7.  **Traceability**: Every step is logged with a common `traceId` across all five microservices for observability.

## System Architecture Summary

- **Resilient Microservices**: Five specialized NestJS services (Identity, Gateway, Stock, Kitchen, Notification).
- **Asynchronous Reliability**: BullMQ handles order fulfillment to prevent data loss during traffic spikes.
- **Strict Stock Consistency**: Optimistic locking in PostgreSQL ensures inventory is never oversold.
- **Idempotent API**: Gateway uses Redis to ensure that network retries never result in duplicate orders.

## Stack at a Glance

| Category       | Technology                          |
| -------------- | ----------------------------------- |
| Frontend       | TanStack Start, React, Tailwind CSS |
| Backend        | NestJS (Microservices), Turborepo   |
| Database       | PostgreSQL 15 (Prisma ORM)          |
| Auth           | JWT (Stateless), role-based guards  |
| Infrastructure | Docker Compose, Redis, BullMQ       |
| Key Libraries  | Socket.io, Axios, ioredis           |

## Key Design Decisions

1. **Idempotency Guard**: Implemented an atomic Redis-based lock in the Gateway to handle the "double-tap" ordering problem.
2. **Chaos Mode Controller**: Designed a system to intentionally inject failures (via Redis flags) to test the system's ability to gracefully degrade.
3. **Shared Types Package**: Utilized a monorepo package `@ribatx/types` to ensure the frontend and all backends always agree on the data schema.
4. **Redis-Centric Resilience**: Leverages Redis for short-term persistence (chaos, stock cache, idempotency) to maximize throughput.

---

**[View Architecture & Stack Diagrams (Mermaid)](assets/mermaid-diagrams.md)**
