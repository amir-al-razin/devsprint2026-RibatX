# System Architecture

## 1. Architecture Overview

The RibatX Cafeteria System follows a modern microservices architecture designed for high availability, eventual consistency, and resilience. The system is composed of six primary services orchestrated through an API Gateway. It utilizes a hybrid communication model, combining synchronous RESTful APIs for time-critical operations (like stock reservation) and asynchronous message queues for long-running tasks (like kitchen order processing).

## 2. System Components

### Gateway Service (`@ribatx/gateway`)

The entry point for all client requests. It handles:

- **Authentication Proxying**: Verifies JWTs and manages student/admin roles.
- **Order Orchestration**: Coordinates calls between Stock and Kitchen services.
- **Resilience Layer**: Implements idempotency (via Redis), chaos mode gates, and caching.
- **Metrics & Observability**: Intercepts requests to collect performance indicators.

### Identity Service (`@ribatx/identity`)

Responsible for user credentials and token issuance. It manages:

- **User Persistence**: Stores student and admin accounts in PostgreSQL.
- **JWT Issuance**: Signs tokens with specific claims (studentId, name, role).
- **Admin Management**: Dynamically assigns admin roles based on environment configurations.

### Stock Service (`@ribatx/stock`)

Manages inventory levels with strict consistency. Key features:

- **Optimistic Locking**: Uses a `version` column and Prisma's `updateMany` to prevent race conditions during concurrent orders.
- **Cache Synchronization**: Updates Redis cache immediately after successful DB reservations.

### Kitchen Service (`@ribatx/kitchen`)

The core processing unit for order fulfillment. It is a worker-based service that:

- **BullMQ Workers**: Consumes orders from the `kitchen-orders` queue.
- **Cooking Simulation**: Mimics real-world delays before triggering notifications.

### Notification Service (`@ribatx/notification`)

Handles real-time communication with users via WebSockets. It acts as a bridge between the backend services and the frontend client.

### Web Frontend (`@ribatx/web`)

A high-performance TanStack Start application providing:

- **SSR & Type-Safe Routing**: Seamless user experience with server-side rendering.
- **Real-time Status Boards**: Auto-updating dashboard for students tracking their orders.

## 3. Component Interaction & Data Flow

### Core Flow: Order Placement

1. **Client**: Sends a `POST /orders` request with an `X-Idempotency-Key` and `itemId`.
2. **Gateway**:
   - Checks if the idempotency key exists in Redis (prevents duplicate processing).
   - Validates the User JWT.
   - Checks the Redis cache for stock availability (fast failure).
   - Calls the **Stock Service** via REST for an official reservation.
3. **Stock Service**: Performs an optimistic lock update in PostgreSQL. On success, it updates the Redis stock cache.
4. **Gateway**: Adds the order to the `kitchen-orders` BullMQ queue. Returns a `201 Created` with the `orderId`.
5. **Kitchen Service**: Picks up the job from the queue. Sends an "IN_KITCHEN" notification to the **Notification Service**.
6. **Notification Service**: Emits an `order:status` event to the student's WebSocket room.
7. **Kitchen Service**: After processing (cooking), sends a "READY" notification.
8. **Client**: UI updates instantly via Socket.io.

## 4. API Design

The system uses a namespaced RESTful API design:

- `/auth/*`: Proxied to Identity Service for login/registration.
- `/orders/*`: Managed by Gateway for ordering and history.
- `/stock/*`: Internal-only stock operations.
- `/admin/*`: Specialized endpoints for metrics and chaos control.

All internal service-to-service calls are secured via an `X-Internal-API-Key`.

## 5. Database & Storage Design

- **PostgreSQL**: Five logical databases (`identity_db`, `order_db`, `stock_db`, `kitchen_db`, `notify_db`) ensure service isolation and data ownership.
- **Prisma ORM**: Used for type-safe database access and migrations.
- **Redis**:
  - **Caching**: Stock levels and order details.
  - **Persistence**: Idempotency results (1-hour TTL).
  - **State Management**: Chaos mode toggles.
  - **Queue Backend**: Storage for BullMQ jobs.

## 6. Authentication & Security

- **JWT**: Stateless authentication using a common secret across services.
- **RBAC**: Role-based access control implemented via NestJS Guards (`RolesGuard`).
- **Internal Security**: Environment-controlled API keys for cross-service patching.
- **Idempotency**: Atomic Redis locks in `IdempotencyGuard` prevent double-billing and duplicate order creation.

## 7. Deployment & Infrastructure

- **Containerization**: Full Docker support with `docker-compose.yml` defining the entire stack.
- **Monorepo Management**: Turborepo manages builds, linting, and workspace dependencies.
- **Scalability**: Each service is stateless, allowing horizontal scaling behind the gateway.

## 8. Architecture Diagram

The visual representation of this architecture, showing service borders, network protocols, and data stores, can be found in: **[mermaid-diagrams.md](assets/mermaid-diagrams.md)**.
