# Requirement Analysis

## 1. Problem Statement

The IUT Cafeteria currently faces significant operational challenges during peak hours, particularly during Iftar. The manual ordering process is slow, leading to long queues, human errors in order tracking, and inventory mismanagement. Students lack visibility into their order status, and the cafeteria staff struggles with coordinating order preparation and stock levels in real-time. This results in poor user experience and operational inefficiency.

## 2. Goals & Objectives

The RibatX Cafeteria System aims to:

- **Streamline Ordering**: Provide a digital platform for students to place orders efficiently.
- **Real-time Visibility**: Enable students to track their orders from "Pending" to "Ready" using WebSocket notifications.
- **Accurate Inventory**: Implement robust stock management with concurrency control to prevent overselling.
- **System Resilience**: Build a microservices architecture capable of handling high loads and recovering from service failures.
- **Operational Efficiency**: Automate the flow of information between the gateway, stock, and kitchen services.

## 3. User Stories

### Student Journey

- **Seamless Fast-Breaking Preparation**: _As a student,_ I want to authenticate securely and place my Iftar order minutes before 5 PM, so that I can ensure my meal is reserved during the peak digital rush.
- **Real-Time Order Awareness**: _As a student,_ I want to see my order transition from "Pending" to "Stock Verified" and finally "Ready" via push notifications, so I can avoid standing in a physically crowded lobby.
- **Resilient Ordering**: _As a student,_ I want the system to handle intermittent mobile network failures gracefully, so that if I click "Order" and my connection drops, I won't be charged twice or lose my spot.
- **Instant Acknowledgment**: _As a student,_ I want to receive an order confirmation in less than 2 seconds, even if the kitchen is backlogged, so I have peace of mind that my request is in the queue.

### Administrator & Judge Roles

- **Operational Oversight**: _As an admin,_ I want a real-time health grid of all microservices, so I can immediately identify if the Stock or Notification service is choking under load.
- **Traffic Analysis**: _As an admin,_ I want to view live throughput and latency metrics, so I can optimize cafeteria resources based on actual order volume.
- **Fault Tolerance Validation**: _As a judge,_ I want to toggle "Chaos Mode" on any service (e.g., kill the Stock Service), so I can observe how the rest of the system maintains partial functionality and gracefully notifies the user.

## 4. Functional Requirements

1. **User Authentication**: Secure login for students and admins using Student ID and password.
2. **Order Placement**: Students can select items (e.g., Iftar Box) and place orders.
3. **Idempotent Ordering**: Support for `X-Idempotency-Key` to prevent duplicate orders due to network retries.
4. **Stock Reservation**: Automated stock decrementing upon order placement with optimistic locking.
5. **Kitchen Queue Management**: Asynchronous processing of orders using a reliable message queue.
6. **Real-time Notifications**: Instant updates to students via WebSockets when an order moves to "In Kitchen" or "Ready".
7. **Order History & Timeline**: Users can view the full lifecycle of their orders with timestamps and trace IDs.
8. **Admin Dashboard**: Specialized view for administrators to monitor system health and manage stock levels.
9. **Chaos Simulation**: Admin ability to toggle "Chaos Mode" for services to test system resilience.

## 5. Non-Functional Requirements

- **Performance**: Low-latency order placement using Redis caching for stock checks.
- **Consistency**: High data consistency for inventory using optimistic locking (`version` column in Prisma).
- **Scalability**: Microservices architecture allows independent scaling of bottleneck services like `kitchen` or `stock`.
- **Reliability**: Use of BullMQ ensures no orders are lost even if the kitchen service is temporarily down.
- **Observability**: Distributed tracing with `traceId` and centralized metrics collection in the gateway.
- **Security**: JWT-based authentication with role-based access control (RBAC).

## 6. Constraints & Assumptions

- **Pre-seeded Accounts**: Self-registration is disabled for security; accounts are pre-seeded or created via Identity API.
- **Single Item Goal**: The initial focus is on high-volume items like the "Iftar Box".
- **Infrastructure**: Assumes availability of PostgreSQL and Redis as primary data and message backends.
- **Internal Communication**: Services trust internal requests verified by an `INTERNAL_API_KEY`.

## 7. User Roles & Use Cases

### Student

- **Place Order**: Authenticates, checks menu, and submits an order.
- **Track Order**: Joins a WebSocket room to receive live status updates.
- **View Timeline**: Checks the detailed history of an order to see when it was verified and processed.

### Admin

- **System Monitoring**: Accesses the `/admin` dashboard to view real-time metrics and service health.
- **Stock Management**: Adjusts item quantities via the `AdminStockController` in the Gateway.
- **Resilience Testing**: Activates chaos mode on specific services via the `ChaosController` to validate retry logic and circuit breaking.
