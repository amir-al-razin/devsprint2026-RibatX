import { createFileRoute, redirect } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
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
import { gatewayApi, stockApi } from '@/lib/api-client'
import { getValidToken } from '@/lib/auth'
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

function svcUrl(envKey: string, fallbackPort: number, path: string): string {
  const base = env[envKey] ?? `http://localhost:${fallbackPort}`
  return `${base}${path}`
}

const HEALTH_URLS: Record<string, string> = {
  gateway: svcUrl('VITE_GATEWAY_URL', 3000, '/health'),
  identity: svcUrl('VITE_IDENTITY_URL', 3001, '/health'),
  stock: svcUrl('VITE_STOCK_URL', 3002, '/health'),
  kitchen: svcUrl('VITE_KITCHEN_URL', 3003, '/health'),
  notification: svcUrl('VITE_NOTIFICATION_URL', 3004, '/health'),
}

const GATEWAY_METRICS_URL = `${env.VITE_GATEWAY_URL ?? 'http://localhost:3000'}/metrics`

// ─── Types ───────────────────────────────────────────────────────────────────

interface CachePoint {
  t: string
  hits: number
  misses: number
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HealthDot({ url, service }: { url: string; service: string }) {
  const data = useMetricsPoller<HealthResponse>(url, 5000)

  // Use the typed api-client so the Authorization header is sent when present
  const [chaosMode, setChaosMode] = useState<'ON' | 'OFF' | null>(null)
  const pollChaos = useCallback(async () => {
    try {
      const result = await gatewayApi.getChaosStatus(service)
      setChaosMode(result.chaosMode)
    } catch {
      // silently ignore — endpoint may not be guarded yet
    }
  }, [service])
  useEffect(() => {
    pollChaos()
    const timer = setInterval(pollChaos, 3000)
    return () => clearInterval(timer)
  }, [pollChaos])

  const ok = data?.status === 'ok'
  const isChaos = chaosMode === 'ON'
  return (
    <div className="flex items-center gap-2">
      <Badge
        className={cn(
          'capitalize',
          ok
            ? 'bg-green-500 text-white hover:bg-green-500'
            : data === null
              ? 'bg-muted text-muted-foreground'
              : 'bg-destructive text-destructive-foreground hover:bg-destructive',
        )}
      >
        {service}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {data === null ? '…' : ok ? 'ok' : 'down'}
      </span>
      {isChaos && (
        <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-xs animate-pulse">
          CHAOS
        </Badge>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  unit = '',
}: {
  label: string
  value: number | string | null
  unit?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold tabular-nums">
          {value === null ? '—' : `${value}${unit}`}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/admin/_layout/')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return // SSR: skip
    const token = getValidToken()
    if (!token) throw redirect({ to: '/login' })
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  // Gateway metrics polled every 3s
  const metrics = useMetricsPoller<MetricsResponse>(GATEWAY_METRICS_URL, 3000)

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

  // Chaos toggles — local state (optimistic)
  const CHAOS_SERVICES = [
    ServiceName.GATEWAY,
    ServiceName.STOCK,
    ServiceName.KITCHEN,
    ServiceName.NOTIFICATION,
  ] as const

  // Restock panel state
  const [currentQty, setCurrentQty] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState<string>('')
  const [restocking, setRestocking] = useState(false)

  // Load current stock quantity on mount and after a successful restock
  const refreshStock = useCallback(() => {
    stockApi
      .items()
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

  async function handleChaosToggle(service: ServiceName, enabled: boolean) {
    setChaosState((prev) => ({ ...prev, [service]: enabled }))
    try {
      await gatewayApi.toggleChaos({ service, enabled })
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

  return (
    <div className="flex flex-col gap-8">
      {/* Latency overlay */}
      {latencyAlert && (
        <div className="fixed inset-0 bg-red-600/90 z-50 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-white text-4xl font-bold">⚠️ HIGH LATENCY</p>
          <p className="text-white/80 text-lg mt-2">
            Gateway avg latency &gt; 1000ms for the last 30s
          </p>
        </div>
      )}

      <h1 className="text-2xl font-bold">System Monitor</h1>

      {/* Health Grid */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Service Healthhhh
        </h2>
        <Card>
          <CardContent className="pt-4 flex flex-wrap gap-4">
            {Object.entries(HEALTH_URLS).map(([service, url]) => (
              <HealthDot key={url} url={url} service={service} />
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Metrics Panel */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Gateway Metrics (live)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Uptime"
            value={metrics ? Math.floor(metrics.uptime_seconds / 60) : null}
            unit=" min"
          />
          <MetricCard
            label="Orders Total"
            value={metrics?.orders_total ?? null}
          />
          <MetricCard
            label="Avg Latency"
            value={metrics?.avg_latency_ms ?? null}
            unit=" ms"
          />
          <MetricCard
            label="P95 Latency"
            value={metrics?.p95_latency_ms ?? null}
            unit=" ms"
          />
          <MetricCard
            label="Orders Failed"
            value={metrics?.orders_failed ?? null}
          />
          <MetricCard label="Cache Hits" value={metrics?.cache_hits ?? null} />
          <MetricCard
            label="Cache Misses"
            value={metrics?.cache_misses ?? null}
          />
          <MetricCard
            label="Hit Ratio"
            value={
              metrics?.cache_hits != null && metrics?.cache_misses != null
                ? (
                    (metrics.cache_hits /
                      Math.max(1, metrics.cache_hits + metrics.cache_misses)) *
                    100
                  ).toFixed(1)
                : null
            }
            unit="%"
          />
        </div>
      </section>

      {/* Cache Hit Chart */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Cache Hit / Miss (rolling 60 points)
        </h2>
        <Card>
          <CardContent className="pt-4">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Waiting for data…
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hits"
                    stroke="#22c55e"
                    dot={false}
                    strokeWidth={2}
                    name="Cache Hits"
                  />
                  <Line
                    type="monotone"
                    dataKey="misses"
                    stroke="#ef4444"
                    dot={false}
                    strokeWidth={2}
                    name="Cache Misses"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Chaos Toggles */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Chaos Toggles
        </h2>
        <Card>
          <CardContent className="pt-4 flex flex-wrap gap-6">
            {CHAOS_SERVICES.map((service) => (
              <div key={service} className="flex items-center gap-2">
                <Switch
                  id={`chaos-${service}`}
                  checked={chaosState[service]}
                  onCheckedChange={(val) => handleChaosToggle(service, val)}
                />
                <Label
                  htmlFor={`chaos-${service}`}
                  className="capitalize cursor-pointer"
                >
                  {service}
                </Label>
                {chaosState[service] && (
                  <Badge className="bg-destructive text-destructive-foreground text-xs">
                    FAILING
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Iftar Box Restock */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Iftar Box Stock
        </h2>
        <Card>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Current quantity:
              </span>
              <span className="text-2xl font-bold tabular-nums">
                {currentQty === null ? '—' : currentQty}
              </span>
            </div>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                type="number"
                min={0}
                placeholder="New quantity"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRestock()}
                className="w-36"
              />
              <Button
                onClick={handleRestock}
                disabled={restocking || restockQty === ''}
                size="sm"
              >
                {restocking ? 'Updating…' : 'Set Quantity'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sets the absolute quantity of Iftar Boxes available for ordering.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
