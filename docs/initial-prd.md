Here is the comprehensive **Product Requirements Document (PRD)**. It aggregates every requirement from the DevSprint 2026 problem statement, our architectural decisions, the chosen tech stack, and the "exceptional" features we discussed.

You can feed this directly to Claude or any other AI to begin the implementation phase.

---

# Product Requirements Document (PRD)

**Project:** DevSprint 2026 - IUT Cafeteria "Distributed System"
**Version:** 1.0
**Status:** Approved for Implementation

## 1. Executive Summary

**Objective:** Replace the failing "Spaghetti Monolith" of the IUT Cafeteria with a resilient, event-driven microservices architecture capable of handling high-concurrency traffic during the Ramadan rush.
**Core Philosophy:** **"Survival over Speed."** The system must prioritize fault tolerance, ensuring that a failure in one service (e.g., Kitchen) does not crash the entire application (e.g., Login or Ordering).
**Deliverable:** A full-stack application running 5 backend microservices, 2 frontends, and infrastructure (DB + Redis) via a single `docker compose up` command.

---

## 2. System Architecture

**Pattern:** Event-Driven Microservices.
**Isolation Strategy:**

* **Services:** 5 distinct NestJS applications (Monorepo).
* 
**Database:** Single Physical PostgreSQL Container hosting **5 Logical Databases** (Schema-per-service isolation) to ensure no cross-service coupling.


* **Infrastructure:** Docker Compose for orchestration.

### The 5 Microservices

1. **Identity Provider (Auth Service):** The Single Source of Truth for user verification. Issues JWT tokens.


2. **Order Gateway (API Gateway):** The Entry Point. Validates tokens and checks **Redis Cache** before touching the DB. Acts as the "Traffic Cop".


3. 
**Stock Service (Inventory):** Manages inventory with **Optimistic Locking** to prevent overselling.


4. **Kitchen Queue (Worker):** Asynchronous order processor. Decouples the user's "Order Placed" feedback (<2s) from the "Cooking" time (3-7s).


5. 
**Notification Hub (Real-Time):** Pushes WebSocket updates (e.g., "Ready") to the frontend.



---

## 3. Technology Stack (Strict)

* **Repo Structure:** **Turborepo** (Monorepo for shared Types/Config).
* **Frontend:** **TanStack Start** (React + TypeScript).
* *App A:* Student Journey UI.
* *App B:* Admin Monitoring Dashboard.


* **Backend:** **NestJS** (Node.js).
* **Database:** **PostgreSQL** (Dockerized, `postgres:15-alpine`).
* **ORM:** **Prisma** (with 5 separate schemas for isolation).
* **Cache & Queue:** **Redis** (Dockerized, `redis:alpine`). used for:
* Caching Stock (Gateway).
* Job Queue (Kitchen).
* Rate Limiting (Identity).


* **Real-Time:** **Socket.io** (NestJS Gateway).
* **Validation:** `zod` or `class-validator`.

---

## 4. Functional Requirements

A. Student Journey (The "One Button" Flow) 

* **Auth Flow:** Standard login (ID/Password). **Rate Limit:** 3 attempts/min per student (Security Bonus).


* **The Ordering UX:**
* **Click:** "Order Iftar" (Optimistic Update: <2s response).
* **Loading:** Shows "Checking Stock..." (Gateway hits Redis Cache).
* **Success:** Button changes to "Order Placed" (Green Tick).
* **Status Update:** Real-time progress (via WebSocket):
* "In Kitchen" (Orange).
* "Ready" (Green/Flashing).




* **Queue Visibility:** The user should see their **Position in Queue** (e.g., "#42"). This is fetched from the **Redis List Length (`LLEN`)**.

B. Admin Dashboard (Monitoring) 

* 
**Health Grid:** 5 color-coded boxes (Green/Red) showing the live health of each microservice.


* 
**Live Metrics:** Real-time throughput (Orders/Min), Error Rate, and Average Latency.


* 
**Bonus Alert:** Flash **RED** if Gateway latency > 1s.




* 
**The Chaos Toggle:** A UI switch to "kill" a service (e.g., Stock Service).


* **Implementation:** An API call sets a `simulatedFailure = true` flag in the target service, causing it to reject all requests or time out.



---

## 5. System Design (Detailed Implementation)

### A. Database Strategy (Logical Split)

* **Container:** `minivercel_db` (Postgres 15).
* 
**Init Script:** A mounted `init.sql` script creates 5 databases: `identity_db`, `order_db`, `stock_db`, `kitchen_db`, `notify_db`.


* **Why:** Ensures strict isolation. The Identity Service cannot query the Stock table directly.

B. Concurrency Control (Optimistic Locking) 

* **Requirement:** Prevent "Double Booking" during the rush.
* **Implementation:**
* Schema: Add `@version` field to the `Item` model.
* Logic: `UPDATE Item SET quantity = q-1, version = v+1 WHERE id = x AND version = v`.
* Outcome: If concurrent requests hit, one fails gracefully ("Sold Out").



### C. Communication Protocols

* **Synchronous (HTTP):** Gateway $\rightarrow$ Identity (Token Check), Gateway $\rightarrow$ Stock (Reservation).
* *Reason:* Immediate validation required.


* **Asynchronous (Redis Queue):** Gateway $\rightarrow$ Kitchen (Order Processing).
* 
*Reason:* Decouples the 3-7s cooking time from the user response.




* **Real-Time (WebSockets):** Kitchen $\rightarrow$ Notification $\rightarrow$ Frontend.
* 
*Reason:* Push updates without polling.





---

## 6. Critical Features ("The Winning Edge")

### A. Graceful Degradation (Chaos Handling)

* If the **Stock Service** is killed via the Chaos Toggle:
* The **Student UI** must **NOT** crash.
* The Gateway should detect the failure and serve cached data from Redis with a warning: *"⚠ Live stock unavailable. Showing cached data."*



### B. Optimistic UI

* The Frontend should assume success immediately upon clicking "Order" to feel instantaneous. If the backend fails 1s later, revert the UI state and show a toast error.

### C. Visual Proof (Admin)

* Include a live graph comparing **"Cache Hits" vs. "DB Hits"** to prove the architecture's efficiency to the judges.

---

## 7. Deliverables Checklist

1. **Repo:** A single Turborepo containing all 7 apps/packages.
2. **Docker Compose:** A root `docker-compose.yml` that spins up:
* 5 Backend Services.
* 2 Frontend Apps (Served via Nginx or Node).
* Postgres DB.
* Redis.


3. **Documentation:** `README.md` with instructions to run the system and access the Admin Dashboard.
4. 
**Bonus:** Cloud Deployment URL (if time permits).