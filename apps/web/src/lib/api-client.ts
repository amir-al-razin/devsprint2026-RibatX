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
import { getValidToken } from './auth'

// In dev these resolve through the Vite proxy.
// In Docker / Railway use the injected env vars that point to real services.
const GATEWAY_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_GATEWAY_URL ?? '/api'

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
  const token = getValidToken()

  if (!skipAuth && !token) {
    throw { status: 401, message: 'Missing authentication token' } as ApiError
  }

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
    request<AuthResponse>(GATEWAY_URL, '/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(body),
    }),

  login: (body: LoginRequest) =>
    request<AuthResponse>(GATEWAY_URL, '/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(body),
    }),
}

// ─────────────────────────────────────────────
// Order Gateway  (:3000  →  /api in dev)
// ─────────────────────────────────────────────

export const gatewayApi = {
  placeOrder: (itemId: string, idempotencyKey: string) =>
    request<OrderResponseDto>(GATEWAY_URL, '/orders', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
      extraHeaders: { 'X-Idempotency-Key': idempotencyKey },
    }),

  getOrder: (orderId: string) =>
    request<OrderResponseDto>(GATEWAY_URL, `/orders/${orderId}`),

  getOrderTimeline: (orderId: string) =>
    request<{
      orderId: string
      currentStatus: string
      timeline: Array<{
        status: string
        at: string
        source: string
        traceId?: string
      }>
    }>(GATEWAY_URL, `/orders/${orderId}/timeline`),

  health: () =>
    request<HealthResponse>(GATEWAY_URL, '/health', { skipAuth: true }),
  metrics: () =>
    request<MetricsResponse>(GATEWAY_URL, '/metrics', { skipAuth: true }),

  toggleChaos: (body: ChaosToggleRequest) =>
    request<ChaosToggleResponse>(GATEWAY_URL, '/admin/chaos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getChaosStatus: (service: string) =>
    request<{ service: string; chaosMode: 'ON' | 'OFF' }>(
      GATEWAY_URL,
      `/admin/chaos/status?service=${service}`,
    ),

  restock: (quantity: number) =>
    request<{ id: string; name: string; quantity: number }>(
      GATEWAY_URL,
      '/admin/stock/restock',
      { method: 'PATCH', body: JSON.stringify({ quantity }) },
    ),

  stockItems: () =>
    request<StockItem[]>(GATEWAY_URL, '/admin/observability/stock/items'),

  serviceHealth: (
    service: 'gateway' | 'identity' | 'stock' | 'kitchen' | 'notification',
  ) =>
    request<HealthResponse>(
      GATEWAY_URL,
      `/admin/observability/health/${service}`,
    ),

  serviceMetrics: (
    service: 'identity' | 'stock' | 'kitchen' | 'notification',
  ) =>
    request<MetricsResponse>(
      GATEWAY_URL,
      `/admin/observability/metrics/${service}`,
    ),

  kitchenQueueLength: () =>
    request<{ waiting: number; active: number; total: number }>(
      GATEWAY_URL,
      '/admin/observability/kitchen/queue/length',
    ),

  kitchenQueueRecent: (limit = 10) =>
    request<{ total: number; items: Array<unknown> }>(
      GATEWAY_URL,
      `/admin/observability/kitchen/queue/recent?limit=${limit}`,
    ),
}
