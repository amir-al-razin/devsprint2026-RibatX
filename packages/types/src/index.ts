import { z } from "zod";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export enum OrderStatus {
  PENDING = "PENDING",
  STOCK_VERIFIED = "STOCK_VERIFIED",
  IN_KITCHEN = "IN_KITCHEN",
  READY = "READY",
  NOTIFIED = "NOTIFIED",
  FAILED = "FAILED",
}

export enum ServiceName {
  IDENTITY = "identity",
  GATEWAY = "gateway",
  STOCK = "stock",
  KITCHEN = "kitchen",
  NOTIFICATION = "notification",
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  studentId: z.string().min(1),
  password: z.string().min(6),
});

export const RegisterRequestSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(6),
});

export const AuthResponseSchema = z.object({
  access_token: z.string(),
  studentId: z.string(),
  name: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ─────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────

export const CreateOrderSchema = z.object({
  itemId: z.string().min(1),
});

export const OrderResponseSchema = z.object({
  orderId: z.string(),
  status: z.nativeEnum(OrderStatus),
  position: z.number().optional(),
  message: z.string().optional(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type OrderResponseDto = z.infer<typeof OrderResponseSchema>;

// ─────────────────────────────────────────────
// Stock
// ─────────────────────────────────────────────

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  version: number;
}

export interface ReserveResponse {
  reserved: boolean;
  remaining: number;
  itemId: string;
}

// ─────────────────────────────────────────────
// Health & Metrics
// ─────────────────────────────────────────────

export type DependencyStatus = "ok" | "unreachable";

export interface HealthResponse {
  status: "ok" | "degraded";
  service: ServiceName;
  dependencies: {
    postgres?: DependencyStatus;
    redis?: DependencyStatus;
  };
}

export interface MetricsResponse {
  service: ServiceName;
  uptime_seconds: number;
  orders_total: number;
  orders_failed: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hits?: number;
  cache_misses?: number;
  queue_depth?: number;
}

// ─────────────────────────────────────────────
// WebSocket Events
// ─────────────────────────────────────────────

export interface OrderStatusEvent {
  orderId: string;
  status: OrderStatus;
  position?: number;
}

// ─────────────────────────────────────────────
// Chaos
// ─────────────────────────────────────────────

export interface ChaosToggleRequest {
  service: ServiceName;
  enabled: boolean;
}

export interface ChaosToggleResponse {
  service: ServiceName;
  simulatedFailure: boolean;
}

// ─────────────────────────────────────────────
// Notification
// ─────────────────────────────────────────────

export interface NotifyOrderRequest {
  status: OrderStatus;
  studentId: string;
}
