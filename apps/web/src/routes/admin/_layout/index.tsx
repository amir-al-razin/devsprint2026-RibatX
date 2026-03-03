import { createFileRoute, redirect } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Server,
  Zap,
  Clock,
  HardDrive,
  Cpu,
  ShieldAlert,
  Package,
  AlertCircle,
  Flame,
  Siren,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ServiceName } from '@ribatx/types'
import type { HealthResponse, MetricsResponse } from '@ribatx/types'
import { gatewayApi } from '@/lib/api-client'
import { getValidToken, isAdmin } from '@/lib/auth'
import { useMetricsPoller } from '@/hooks/useMetricsPoller'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ─── URL helpers ─────────────────────────────────────────────────────────────

const env = (import.meta as ImportMeta & { env: Record<string, string> }).env

const GATEWAY_BASE = env.VITE_GATEWAY_URL ?? '/api'

function gatewayUrl(path: string): string {
  return `${GATEWAY_BASE}${path}`
}

const HEALTH_URLS: Record<string, string> = {
  gateway: gatewayUrl('/admin/observability/health/gateway'),
  identity: gatewayUrl('/admin/observability/health/identity'),
  stock: gatewayUrl('/admin/observability/health/stock'),
  kitchen: gatewayUrl('/admin/observability/health/kitchen'),
  notification: gatewayUrl('/admin/observability/health/notification'),
}

const GATEWAY_METRICS_URL = gatewayUrl('/metrics')

const SERVICE_METRICS_URLS = {
  identity: gatewayUrl('/admin/observability/metrics/identity'),
  stock: gatewayUrl('/admin/observability/metrics/stock'),
  kitchen: gatewayUrl('/admin/observability/metrics/kitchen'),
  notification: gatewayUrl('/admin/observability/metrics/notification'),
} as const

const CHAOS_SERVICES = [
  ServiceName.GATEWAY,
  ServiceName.IDENTITY,
  ServiceName.STOCK,
  ServiceName.KITCHEN,
  ServiceName.NOTIFICATION,
] as const

const INCIDENT_TIMELINE_STORAGE_KEY = 'admin:incident-timeline:v1'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CachePoint {
  t: string
  hits: number
  misses: number
}

interface IncidentEvent {
  id: string
  at: string
  service: string
  kind: 'health' | 'chaos'
  message: string
  severity: 'info' | 'warning' | 'critical'
}

interface KitchenQueueItem {
  orderId: string
  studentId?: string
  itemId?: string
  traceId?: string
  state: 'waiting' | 'active'
  createdAt: string
}

interface ServiceTelemetryMetrics {
  uptime_seconds: number
  orders_total: number
  orders_failed: number
  avg_latency_ms: number
  p95_latency_ms: number
}

function formatUptimeCompact(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HealthDot({
  url,
  service,
  onHealthChange,
}: {
  url: string
  service: string
  onHealthChange?: (payload: {
    service: string
    status: 'healthy' | 'down'
  }) => void
}) {
  const token = getValidToken()
  const data = useMetricsPoller<HealthResponse>(
    url,
    5000,
    token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
    Boolean(token),
  )

  // Use the typed api-client so the Authorization header is sent when present
  const [chaosMode, setChaosMode] = useState<'ON' | 'OFF' | null>(null)
  const pollChaos = useCallback(async () => {
    if (!token) return
    try {
      const result = await gatewayApi.getChaosStatus(service)
      setChaosMode(result.chaosMode)
    } catch {
      // silently ignore — endpoint may not be guarded yet
    }
  }, [service, token])
  useEffect(() => {
    pollChaos()
    const timer = setInterval(pollChaos, 3000)
    return () => clearInterval(timer)
  }, [pollChaos])

  const lastHealthRef = useRef<'healthy' | 'down' | null>(null)
  const isChaos = chaosMode === 'ON'
  const ok = data?.status === 'ok' && !isChaos

  useEffect(() => {
    const next = data === null ? null : ok ? 'healthy' : 'down'
    if (!next) return
    if (lastHealthRef.current !== next) {
      onHealthChange?.({ service, status: next })
      lastHealthRef.current = next
    }
  }, [data, ok, onHealthChange, service])

  const statusText =
    data === null ? 'connecting' : isChaos ? 'chaos' : ok ? 'healthy' : 'down'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-2.5 px-3.5 py-3 rounded-lg transition-colors hover:bg-secondary/25"
    >
      <div className="relative">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full absolute',
            ok ? 'bg-green-500 animate-ping opacity-75' : 'hidden',
          )}
        />
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full relative',
            ok
              ? 'bg-green-500'
              : data === null
                ? 'bg-muted-foreground'
                : 'bg-destructive',
          )}
        />
      </div>
      <span className="font-medium text-sm capitalize tracking-[0.01em]">
        {service}
      </span>
      <span
        className={cn(
          'text-[11px] ml-auto pl-2 rounded-md px-2 py-1 leading-none transition-colors',
          data === null
            ? 'bg-muted text-muted-foreground'
            : ok
              ? 'bg-green-500/15 text-green-500'
              : 'bg-destructive/12 text-destructive',
        )}
      >
        {statusText}
      </span>
    </motion.div>
  )
}

function MetricCard({
  title,
  value,
  unit = '',
  icon: Icon,
  delay = 0,
}: {
  title: string
  value: number | string | null
  unit?: string
  icon?: LucideIcon
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="bg-card transition-colors">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-1">
              <motion.p
                key={String(value)}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold tracking-tight tabular-nums text-foreground"
              >
                {value === null ? '—' : value}
              </motion.p>
              {unit && (
                <span className="text-sm font-medium text-muted-foreground mb-1">
                  {unit}
                </span>
              )}
            </div>
          </div>
          {Icon && (
            <div className="h-10 w-10 rounded-full bg-primary/14 flex items-center justify-center text-primary">
              <Icon size={20} />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/admin/_layout/')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return // SSR: skip
    const token = getValidToken()
    if (!token) throw redirect({ to: '/login' })
    if (!isAdmin(token)) throw redirect({ to: '/unauthorized' })
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const adminToken = getValidToken()
  const authFetchOptions = adminToken
    ? ({
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      } as RequestInit)
    : undefined

  // Gateway metrics polled every 3s
  const metrics = useMetricsPoller<MetricsResponse>(GATEWAY_METRICS_URL, 3000)

  const identityMetrics = useMetricsPoller<ServiceTelemetryMetrics>(
    SERVICE_METRICS_URLS.identity,
    3000,
  )
  const stockMetrics = useMetricsPoller<ServiceTelemetryMetrics>(
    SERVICE_METRICS_URLS.stock,
    3000,
  )
  const kitchenMetrics = useMetricsPoller<ServiceTelemetryMetrics>(
    SERVICE_METRICS_URLS.kitchen,
    3000,
  )
  const notificationMetrics = useMetricsPoller<ServiceTelemetryMetrics>(
    SERVICE_METRICS_URLS.notification,
    3000,
  )

  // Rolling 60-point cache hit/miss chart buffer
  const [chartData, setChartData] = useState<Array<CachePoint>>([])
  useEffect(() => {
    if (!metrics) return
    const point: CachePoint = {
      t: new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      hits: metrics.cache_hits ?? 0,
      misses: metrics.cache_misses ?? 0,
    }
    setChartData((prev) => [...prev.slice(-59), point])
  }, [metrics])

  // 30s rolling latency alert — metrics arrive every 3s → keep last 10 readings
  const latencyWindow = useRef<Array<number>>([])
  const [latencyAlert, setLatencyAlert] = useState(false)
  useEffect(() => {
    if (!metrics) return
    latencyWindow.current = [
      ...latencyWindow.current.slice(-9),
      metrics.avg_latency_ms,
    ]
    const avg =
      latencyWindow.current.reduce((a, b) => a + b, 0) /
      latencyWindow.current.length
    setLatencyAlert(avg > 1000)
  }, [metrics])

  // Restock panel state
  const [currentQty, setCurrentQty] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState<string>('')
  const [restocking, setRestocking] = useState(false)

  // Load current stock quantity on mount and after a successful restock
  const refreshStock = useCallback(() => {
    gatewayApi
      .stockItems()
      .then((items) => {
        const iftarBox =
          items?.find((i) => i.name === 'Iftar Box') ?? items?.[0]
        if (iftarBox) setCurrentQty(iftarBox.quantity)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshStock()
    const timer = setInterval(refreshStock, 5000)
    return () => clearInterval(timer)
  }, [refreshStock])

  async function handleRestock() {
    const qty = parseInt(restockQty, 10)
    if (isNaN(qty) || qty < 0) {
      toast.error('Enter a valid non-negative number')
      return
    }
    setRestocking(true)
    try {
      const result = await gatewayApi.restock(qty)
      setCurrentQty(result.quantity)
      setRestockQty('')
      toast.success(`Restocked to ${result.quantity} units`)
    } catch {
      toast.error('Restock failed')
    } finally {
      setRestocking(false)
    }
  }

  const [chaosState, setChaosState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHAOS_SERVICES.map((s) => [s, false])),
  )
  const [incidentTimeline, setIncidentTimeline] = useState<
    Array<IncidentEvent>
  >([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INCIDENT_TIMELINE_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Array<IncidentEvent>
      if (Array.isArray(parsed)) {
        setIncidentTimeline(parsed.slice(0, 30))
      }
    } catch {
      // ignore corrupted localStorage data
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        INCIDENT_TIMELINE_STORAGE_KEY,
        JSON.stringify(incidentTimeline.slice(0, 30)),
      )
    } catch {
      // ignore storage quota / access issues
    }
  }, [incidentTimeline])

  const pushIncident = useCallback(
    (
      entry:
        | {
            service: string
            kind: 'health'
            status: 'healthy' | 'down'
          }
        | {
            service: string
            kind: 'chaos'
            enabled: boolean
          },
    ) => {
      const now = new Date()
      const event: IncidentEvent =
        entry.kind === 'health'
          ? {
              id: `${entry.service}-health-${now.getTime()}`,
              at: now.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              service: entry.service,
              kind: 'health',
              message:
                entry.status === 'down'
                  ? `${entry.service} reported degraded health`
                  : `${entry.service} recovered to healthy state`,
              severity: entry.status === 'down' ? 'critical' : 'info',
            }
          : {
              id: `${entry.service}-chaos-${now.getTime()}`,
              at: now.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              service: entry.service,
              kind: 'chaos',
              message: entry.enabled
                ? `Chaos enabled for ${entry.service}`
                : `Chaos disabled for ${entry.service}`,
              severity: entry.enabled ? 'warning' : 'info',
            }

      setIncidentTimeline((prev) => [event, ...prev].slice(0, 30))
    },
    [],
  )

  const kitchenQueue = useMetricsPoller<{
    waiting: number
    active: number
    total: number
  }>(
    gatewayUrl('/admin/observability/kitchen/queue/length'),
    3000,
    authFetchOptions,
    Boolean(adminToken),
  )

  const kitchenRecent = useMetricsPoller<{
    total: number
    items: Array<KitchenQueueItem>
  }>(
    gatewayUrl('/admin/observability/kitchen/queue/recent?limit=10'),
    3000,
    authFetchOptions,
    Boolean(adminToken),
  )

  const [healthSnapshot, setHealthSnapshot] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        Object.keys(HEALTH_URLS).map((service) => [service, false]),
      ),
  )

  useEffect(() => {
    if (!adminToken) return

    let active = true

    const pollHealth = async () => {
      const entries = await Promise.all(
        Object.entries(HEALTH_URLS).map(async ([service, url]) => {
          try {
            const res = await fetch(url, authFetchOptions)
            const data = (await res.json()) as HealthResponse
            return [service, data.status === 'ok'] as const
          } catch {
            return [service, false] as const
          }
        }),
      )

      if (!active) return
      setHealthSnapshot(Object.fromEntries(entries))
    }

    pollHealth()
    const timer = setInterval(pollHealth, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [adminToken, authFetchOptions])

  useEffect(() => {
    if (!adminToken) return

    let active = true

    const syncChaosState = async () => {
      try {
        const results = await Promise.all(
          CHAOS_SERVICES.map((service) => gatewayApi.getChaosStatus(service)),
        )

        if (!active) return

        const nextState = Object.fromEntries(
          results.map((result) => [result.service, result.chaosMode === 'ON']),
        ) as Record<string, boolean>

        setChaosState(nextState)
      } catch {
        // Ignore sync errors; existing UI state remains until next poll
      }
    }

    syncChaosState()
    const timer = setInterval(syncChaosState, 3000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [adminToken])

  async function handleChaosToggle(service: ServiceName, enabled: boolean) {
    setChaosState((prev) => ({ ...prev, [service]: enabled }))
    try {
      await gatewayApi.toggleChaos({ service, enabled })
      pushIncident({ service, kind: 'chaos', enabled })
      toast[enabled ? 'warning' : 'success'](
        enabled
          ? `Chaos enabled for ${service}`
          : `Chaos disabled for ${service}`,
      )
    } catch {
      // revert on failure
      setChaosState((prev) => ({ ...prev, [service]: !enabled }))
      toast.error(`Failed to toggle chaos for ${service}`)
    }
  }

  async function applyChaosPreset(
    preset: 'gateway-fail' | 'kitchen-fail' | 'full-stress',
  ) {
    const targets: Record<ServiceName, boolean> = {
      [ServiceName.GATEWAY]: false,
      [ServiceName.STOCK]: false,
      [ServiceName.KITCHEN]: false,
      [ServiceName.NOTIFICATION]: false,
      [ServiceName.IDENTITY]: false,
    }

    if (preset === 'gateway-fail') {
      targets[ServiceName.GATEWAY] = true
    } else if (preset === 'kitchen-fail') {
      targets[ServiceName.KITCHEN] = true
    } else {
      targets[ServiceName.GATEWAY] = true
      targets[ServiceName.IDENTITY] = true
      targets[ServiceName.STOCK] = true
      targets[ServiceName.KITCHEN] = true
      targets[ServiceName.NOTIFICATION] = true
    }

    try {
      await Promise.all(
        CHAOS_SERVICES.map((service) =>
          gatewayApi.toggleChaos({ service, enabled: targets[service] }),
        ),
      )
      const nextState = Object.fromEntries(
        CHAOS_SERVICES.map((service) => [service, targets[service]]),
      ) as Record<string, boolean>
      setChaosState(nextState)
      CHAOS_SERVICES.forEach((service) => {
        pushIncident({ service, kind: 'chaos', enabled: targets[service] })
      })
      toast.success('Chaos preset applied')
    } catch {
      toast.error('Failed to apply chaos preset')
    }
  }

  const queueCapacity = 12
  const queueTotal = kitchenQueue?.total ?? 0
  const queuePercent = Math.min(
    100,
    Math.round((queueTotal / queueCapacity) * 100),
  )
  const queueState =
    queueTotal >= 8 ? 'critical' : queueTotal >= 4 ? 'busy' : 'healthy'

  const healthyCount = Object.values(healthSnapshot).filter(Boolean).length
  const uptimePct = Math.round(
    (healthyCount / Object.keys(HEALTH_URLS).length) * 100,
  )

  const latencyRisk =
    metrics == null
      ? 'unknown'
      : metrics.p95_latency_ms > 1200 || metrics.avg_latency_ms > 1000
        ? 'high'
        : metrics.p95_latency_ms > 700 || metrics.avg_latency_ms > 500
          ? 'medium'
          : 'low'

  const latestCacheRatio =
    chartData.length > 0
      ? (chartData[chartData.length - 1].hits /
          Math.max(
            1,
            chartData[chartData.length - 1].hits +
              chartData[chartData.length - 1].misses,
          )) *
        100
      : null
  const previousCacheRatio =
    chartData.length > 1
      ? (chartData[chartData.length - 2].hits /
          Math.max(
            1,
            chartData[chartData.length - 2].hits +
              chartData[chartData.length - 2].misses,
          )) *
        100
      : null
  const cacheTrend =
    latestCacheRatio == null || previousCacheRatio == null
      ? 'stable'
      : latestCacheRatio - previousCacheRatio > 0.3
        ? 'up'
        : previousCacheRatio - latestCacheRatio > 0.3
          ? 'down'
          : 'stable'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-8 max-w-7xl mx-auto pb-12"
    >
      {/* Latency overlay */}
      <AnimatePresence>
        {latencyAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/90 z-50 flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm"
          >
            <AlertCircle className="w-24 h-24 text-white mb-6 animate-pulse" />
            <p className="text-white text-4xl font-bold tracking-tight">
              HIGH LATENCY
            </p>
            <p className="text-white/80 text-lg mt-2 font-medium">
              Gateway avg latency &gt; 1000ms for the last 30s
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Real-time status of all microservices and metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Health and Actions */}
        <div className="flex flex-col gap-8 lg:col-span-1">
          {/* Health Grid */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Server size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Service Health
              </h2>
            </div>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col gap-3">
                {Object.entries(HEALTH_URLS).map(([service, url]) => (
                  <HealthDot
                    key={url}
                    url={url}
                    service={service}
                    onHealthChange={({ service: svc, status }) => {
                      pushIncident({
                        service: svc,
                        kind: 'health',
                        status,
                      })
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Kitchen Load Radar */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Kitchen Load Radar
              </h2>
            </div>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Queue Occupancy
                    </p>
                    <p className="text-3xl font-bold tabular-nums">
                      {queuePercent}%
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      'uppercase text-[10px]',
                      queueState === 'critical'
                        ? 'bg-destructive/15 text-destructive hover:bg-destructive/20'
                        : queueState === 'busy'
                          ? 'bg-primary/15 text-primary hover:bg-primary/20'
                          : 'bg-green-500/15 text-green-500 hover:bg-green-500/20',
                    )}
                  >
                    {queueState}
                  </Badge>
                </div>
                <div className="h-3 w-full rounded-full bg-secondary/70 overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ width: `${queuePercent}%` }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      'h-full rounded-full',
                      queueState === 'critical'
                        ? 'bg-destructive'
                        : queueState === 'busy'
                          ? 'bg-primary'
                          : 'bg-green-500',
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary/45 p-2.5">
                    <p className="text-[11px] text-muted-foreground uppercase">
                      Waiting
                    </p>
                    <p className="font-semibold tabular-nums">
                      {kitchenQueue?.waiting ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/45 p-2.5">
                    <p className="text-[11px] text-muted-foreground uppercase">
                      Active
                    </p>
                    <p className="font-semibold tabular-nums">
                      {kitchenQueue?.active ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/45 p-2.5">
                    <p className="text-[11px] text-muted-foreground uppercase">
                      Total
                    </p>
                    <p className="font-semibold tabular-nums">
                      {kitchenQueue?.total ?? '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Live Kitchen Queue Board */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Live Kitchen Queue (Top 10)
              </h2>
            </div>
            <Card className="bg-card">
              <CardContent className="p-5">
                {kitchenRecent?.items?.length ? (
                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-3 min-w-max">
                      {kitchenRecent.items.map((item) => (
                        <div
                          key={`${item.orderId}-${item.createdAt}`}
                          className="w-[220px] rounded-lg border border-border bg-secondary/35 p-3.5 text-left transition-colors hover:bg-secondary/55"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <Badge
                              className={cn(
                                'uppercase text-[10px]',
                                item.state === 'active'
                                  ? 'bg-primary/15 text-primary hover:bg-primary/20'
                                  : 'bg-secondary text-muted-foreground hover:bg-secondary',
                              )}
                            >
                              {item.state}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleTimeString(
                                'en-GB',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                },
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            Order
                          </p>
                          <p className="text-sm font-medium break-all">
                            {item.orderId}
                          </p>
                          {item.traceId && (
                            <p className="text-[11px] text-muted-foreground mt-1 break-all">
                              Trace: {item.traceId}
                            </p>
                          )}
                          {item.studentId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Student: {item.studentId}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active queue items right now.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Iftar Box Restock */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Inventory Management
              </h2>
            </div>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Iftar Box Stock
                  </p>
                  <p className="text-3xl font-bold tabular-nums text-foreground">
                    {currentQty === null ? '—' : currentQty}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRestock()}
                      className="bg-secondary/50 border-0 h-10 w-full"
                    />
                    <Button
                      onClick={handleRestock}
                      disabled={restocking || restockQty === ''}
                      size="sm"
                      className="h-10 px-6 font-semibold"
                    >
                      {restocking ? 'Wait…' : 'Update'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Sets absolute quantity of Iftar Boxes available.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Chaos Toggles */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Chaos Engineering
              </h2>
            </div>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-[116px] justify-center"
                    onClick={() => applyChaosPreset('gateway-fail')}
                  >
                    Gateway fail
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-[116px] justify-center"
                    onClick={() => applyChaosPreset('kitchen-fail')}
                  >
                    Kitchen fail
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-[116px] justify-center"
                    onClick={() => applyChaosPreset('full-stress')}
                  >
                    Full stress
                  </Button>
                </div>
                {CHAOS_SERVICES.map((service) => (
                  <motion.div
                    key={service}
                    whileHover={{ x: 2 }}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-3 rounded-lg transition-colors',
                      chaosState[service]
                        ? 'bg-primary/10 hover:bg-primary/14'
                        : 'hover:bg-secondary/25',
                    )}
                  >
                    <Label
                      htmlFor={`chaos-${service}`}
                      className="capitalize font-medium cursor-pointer flex items-center gap-2 text-sm"
                    >
                      {service}
                      {chaosState[service] && (
                        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </Label>
                    <Switch
                      id={`chaos-${service}`}
                      checked={chaosState[service]}
                      onCheckedChange={(val) => handleChaosToggle(service, val)}
                      className={cn(
                        'hover:data-[state=unchecked]:bg-muted',
                        chaosState[service]
                          ? 'data-[state=checked]:bg-primary'
                          : '',
                      )}
                    />
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Right Column: Metrics & Charts */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* SLO Cards */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                SLO Overview
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-card">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rolling Uptime
                  </p>
                  <p className="text-3xl font-bold tabular-nums text-foreground mt-1">
                    {uptimePct}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Latency Risk
                  </p>
                  <div className="mt-2">
                    <Badge
                      className={cn(
                        'uppercase',
                        latencyRisk === 'high'
                          ? 'bg-destructive/15 text-destructive hover:bg-destructive/20'
                          : latencyRisk === 'medium'
                            ? 'bg-primary/15 text-primary hover:bg-primary/20'
                            : latencyRisk === 'low'
                              ? 'bg-green-500/15 text-green-500 hover:bg-green-500/20'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      {latencyRisk}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cache Efficiency
                  </p>
                  <div className="mt-1 flex items-end gap-2">
                    <p className="text-3xl font-bold tabular-nums text-foreground">
                      {latestCacheRatio == null
                        ? '—'
                        : latestCacheRatio.toFixed(1)}
                    </p>
                    <span className="text-sm text-muted-foreground mb-1">
                      %
                    </span>
                    <Badge
                      className={cn(
                        'uppercase text-[10px] mb-1',
                        cacheTrend === 'up'
                          ? 'bg-green-500/15 text-green-500 hover:bg-green-500/20'
                          : cacheTrend === 'down'
                            ? 'bg-destructive/15 text-destructive hover:bg-destructive/20'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      {cacheTrend}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Metrics Panel */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Gateway Telemetry
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard
                title="Total Orders"
                value={metrics?.orders_total ?? null}
                icon={Package}
                delay={0.1}
              />
              <MetricCard
                title="Avg Latency"
                value={metrics?.avg_latency_ms ?? null}
                unit="ms"
                icon={Clock}
                delay={0.2}
              />
              <MetricCard
                title="P95 Latency"
                value={metrics?.p95_latency_ms ?? null}
                unit="ms"
                icon={Zap}
                delay={0.3}
              />
              <MetricCard
                title="Cache Hit Ratio"
                value={
                  metrics?.cache_hits != null && metrics?.cache_misses != null
                    ? (
                        (metrics.cache_hits /
                          Math.max(
                            1,
                            metrics.cache_hits + metrics.cache_misses,
                          )) *
                        100
                      ).toFixed(1)
                    : null
                }
                unit="%"
                icon={HardDrive}
                delay={0.4}
              />
              <MetricCard
                title="Cache Hits"
                value={metrics?.cache_hits ?? null}
                delay={0.5}
              />
              <MetricCard
                title="Cache Misses"
                value={metrics?.cache_misses ?? null}
                delay={0.6}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Service Telemetry
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                title="Identity Uptime"
                value={formatUptimeCompact(
                  identityMetrics?.uptime_seconds ?? null,
                )}
                icon={Clock}
                delay={0.1}
              />
              <MetricCard
                title="Stock Uptime"
                value={formatUptimeCompact(
                  stockMetrics?.uptime_seconds ?? null,
                )}
                icon={Clock}
                delay={0.15}
              />
              <MetricCard
                title="Kitchen Uptime"
                value={formatUptimeCompact(
                  kitchenMetrics?.uptime_seconds ?? null,
                )}
                icon={Clock}
                delay={0.2}
              />
              <MetricCard
                title="Notification Uptime"
                value={formatUptimeCompact(
                  notificationMetrics?.uptime_seconds ?? null,
                )}
                icon={Clock}
                delay={0.25}
              />
            </div>
          </section>

          {/* Cache Hit Chart */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Cache Performance
              </h2>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-card">
                <CardContent className="p-6">
                  {chartData.length === 0 ? (
                    <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <Activity
                        className="animate-pulse opacity-50"
                        size={32}
                      />
                      <p className="text-sm font-medium">
                        Collecting telemetry data…
                      </p>
                    </div>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="t"
                            tick={{
                              fill: 'var(--muted-foreground)',
                              fontSize: 11,
                            }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            minTickGap={30}
                          />
                          <YAxis
                            tick={{
                              fill: 'var(--muted-foreground)',
                              fontSize: 11,
                            }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: 'none',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: 12, paddingTop: '10px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="hits"
                            stroke="var(--color-chart-3)"
                            dot={false}
                            strokeWidth={3}
                            name="Cache Hits"
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="misses"
                            stroke="var(--color-primary)"
                            dot={false}
                            strokeWidth={3}
                            name="Cache Misses"
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </section>

          {/* Incident Timeline */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Siren size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground tracking-wide">
                Service Incident Timeline
              </h2>
            </div>
            <Card className="bg-card">
              <CardContent className="p-5">
                {incidentTimeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Waiting for health transitions and chaos actions…
                  </p>
                ) : (
                  <div className="max-h-[260px] overflow-auto pr-1 space-y-2">
                    {incidentTimeline.map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'rounded-lg px-3 py-2.5 border',
                          event.severity === 'critical'
                            ? 'border-destructive/40 bg-destructive/5'
                            : event.severity === 'warning'
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border bg-secondary/40',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium capitalize">
                            {event.service}
                          </p>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {event.at}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.message}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </motion.div>
  )
}
