import type {
  AuthResponse,
  LoginRequest,
  OrderResponseDto,
  ChaosToggleRequest,
  ChaosToggleResponse,
  HealthResponse,
  MetricsResponse,
  StockItem,
} from '@ribatx/types'
import { getToken } from './auth'

// In dev these resolve through the Vite proxy.
// In Docker / Railway use the injected env vars that point to real services.
const GATEWAY_BASE =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_GATEWAY_URL ?? '/api'
const IDENTITY_BASE =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_IDENTITY_URL ?? 'http://localhost:3001'

// ─────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────

export interface ApiError {
  status: number
  message?: string
  [key: string]: unknown
}

async function request<T>(
  base: string,
  path: string,
  options: RequestInit & {
    skipAuth?: boolean
    extraHeaders?: Record<string, string>
  } = {},
): Promise<T> {
  const { skipAuth = false, extraHeaders = {}, ...fetchOpts } = options
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  }

  const res = await fetch(`${base}${path}`, {
    ...fetchOpts,
    headers: {
      ...headers,
      ...(fetchOpts.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, ...body } as ApiError
  }

  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}

// ─────────────────────────────────────────────
// Identity Provider  (:3001  — no proxy, direct)
// ─────────────────────────────────────────────

export const identityApi = {
  register: (body: { studentId: string; name: string; password: string }) =>
    request<AuthResponse>(IDENTITY_BASE, '/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(body),
    }),

  login: (body: LoginRequest) =>
    request<AuthResponse>(IDENTITY_BASE, '/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(body),
    }),

  health: () =>
    request<HealthResponse>(IDENTITY_BASE, '/health', { skipAuth: true }),
  metrics: () =>
    request<MetricsResponse>(IDENTITY_BASE, '/metrics', { skipAuth: true }),
}

// ─────────────────────────────────────────────
// Order Gateway  (:3000  →  /api in dev)
// ─────────────────────────────────────────────

export const gatewayApi = {
  placeOrder: (itemId: string, idempotencyKey: string) =>
    request<OrderResponseDto>(GATEWAY_BASE, '/orders', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
      extraHeaders: { 'X-Idempotency-Key': idempotencyKey },
    }),

  getOrder: (orderId: string) =>
    request<OrderResponseDto>(GATEWAY_BASE, `/orders/${orderId}`),

  health: () =>
    request<HealthResponse>(GATEWAY_BASE, '/health', { skipAuth: true }),
  metrics: () =>
    request<MetricsResponse>(GATEWAY_BASE, '/metrics', { skipAuth: true }),

  toggleChaos: (body: ChaosToggleRequest) =>
    request<ChaosToggleResponse>(GATEWAY_BASE, '/admin/chaos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getChaosStatus: (service: string) =>
    request<{ service: string; chaosMode: 'ON' | 'OFF' }>(
      GATEWAY_BASE,
      `/admin/chaos/status?service=${service}`,
    ),

  restock: (quantity: number) =>
    request<{ id: string; name: string; quantity: number }>(
      GATEWAY_BASE,
      '/admin/stock/restock',
      { method: 'PATCH', body: JSON.stringify({ quantity }) },
    ),

  stockItems: () =>
    request<StockItem[]>(GATEWAY_BASE, '/admin/observability/stock/items'),

  serviceHealth: (
    service: 'gateway' | 'identity' | 'stock' | 'kitchen' | 'notification',
  ) =>
    request<HealthResponse>(
      GATEWAY_BASE,
      `/admin/observability/health/${service}`,
    ),

  kitchenQueueLength: () =>
    request<{ waiting: number; active: number; total: number }>(
      GATEWAY_BASE,
      '/admin/observability/kitchen/queue/length',
    ),

  kitchenQueueRecent: (limit = 10) =>
    request<{ total: number; items: Array<unknown> }>(
      GATEWAY_BASE,
      `/admin/observability/kitchen/queue/recent?limit=${limit}`,
    ),
}

// ─────────────────────────────────────────────
// Other services (direct in dev, internal in Docker)
// ─────────────────────────────────────────────

function svcBase(envKey: string, fallbackPort: number): string {
  return (
    (import.meta as ImportMeta & { env: Record<string, string> }).env[envKey] ??
    `http://localhost:${fallbackPort}`
  )
}

export const stockApi = {
  items: () =>
    request<StockItem[]>(svcBase('VITE_STOCK_URL', 3002), '/stock/items', {
      skipAuth: true,
    }),
  health: () =>
    request<HealthResponse>(svcBase('VITE_STOCK_URL', 3002), '/health', {
      skipAuth: true,
    }),
  metrics: () =>
    request<MetricsResponse>(svcBase('VITE_STOCK_URL', 3002), '/metrics', {
      skipAuth: true,
    }),
}

export const kitchenApi = {
  queueLength: () =>
    request<{ waiting: number; active: number; total: number }>(
      svcBase('VITE_KITCHEN_URL', 3003),
      '/queue/length',
      { skipAuth: true },
    ),
  health: () =>
    request<HealthResponse>(svcBase('VITE_KITCHEN_URL', 3003), '/health', {
      skipAuth: true,
    }),
  metrics: () =>
    request<MetricsResponse>(svcBase('VITE_KITCHEN_URL', 3003), '/metrics', {
      skipAuth: true,
    }),
}

export const notificationApi = {
  health: () =>
    request<HealthResponse>(svcBase('VITE_NOTIFICATION_URL', 3004), '/health', {
      skipAuth: true,
    }),
  metrics: () =>
    request<MetricsResponse>(
      svcBase('VITE_NOTIFICATION_URL', 3004),
      '/metrics',
      { skipAuth: true },
    ),
}
