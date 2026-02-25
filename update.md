# Project Progress Update - Phase 1 & 2 Completed

This document provides an overview of the microservices architecture implemented so far and instructions on how to manually verify the system.

## 🚀 Implemented Features

### **Phase 1: Core Foundation**
- **Identity Service**: Handles student authentication, issues JWT tokens, and protects against brute-force attacks via Redis-based rate limiting.
- **Stock Service**: Manages inventory with **Optimistic Locking** (versioning) to prevent race conditions during the Ramadan rush.
- **Gateway**: Acts as the entry point, performing JWT validation and stock checks before routing requests.

### **Phase 2: Resilience & Async Processing**
- **Kitchen Service (BullMQ)**: Implements asynchronous order processing. Orders are queued in Redis, allowing the system to handle thousands of requests instantly while the kitchen "cooks" in the background (mocked 3-7s delay).
- **Notification Service (Socket.io)**: Provides real-time status updates (e.g., "In Kitchen", "Order Ready") directly to the student UI via WebSockets.
- **Resilience Layer**:
  - **Idempotency Guard**: Prevents duplicate orders if a user clicks the button multiple times.
  - **Chaos Controller**: Allows simulation of service failures for testing "Auto-Heal" logic.
  - **Metrics Interceptor**: Logs real-time latency and throughput to Redis for the monitoring dashboard.

---

## 🔍 How to Verify Manually

### **1. Setup**
Ensure all services and dependencies are running:
```bash
docker compose up -d
pnpm install
# Start services (using turborepo)
pnpm dev
```

### **2. Authentication (Identity Service)**
**Endpoint**: `POST http://localhost:3001/auth/login`  
**Body**:
```json
{
  "studentId": "2000421XX",
  "password": "your-password"
}
```
*Verify: Returns a `accessToken`. Verify Rate Limiting by hitting this 4+ times in 60s.*

### **3. Place an Order (Gateway)**
**Endpoint**: `POST http://localhost:3000/orders`  
**Headers**:
- `Authorization: Bearer <YOUR_TOKEN>`
- `x-idempotency-key: unique-request-id-123`
**Body**:
```json
{
  "itemId": "item-id-from-db"
}
```
*Verify: Returns `PENDING` status instantly. Try sending the same `x-idempotency-key` twice; the second should return a 409 Conflict.*

### **4. Real-time Status (Notification Service)**
1. Use a tool like **Postman** or a simple Socket.io client.
2. Connect to `ws://localhost:3004`.
3. Emit event `subscribeToOrder` with your `orderId`.
4. Listen for `orderStatusUpdate` event.
*Verify: You should receive a status update after 3-7 seconds when the Kitchen finishes processing.*

### **5. Chaos Testing**
**Endpoint**: `POST http://localhost:3000/chaos/toggle`  
**Body**:
```json
{
  "enabled": true
}
```
*Verify: Once enabled, the service will simulate failure patterns. Disable it to restore normal operation.*

### **6. Metrics**
Check Redis keys starting with `metrics:` to see live latency and throughput data.
