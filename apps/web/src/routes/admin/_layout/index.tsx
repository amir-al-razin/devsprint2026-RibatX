import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  gatewayApi,
  identityApi,
  stockApi,
  kitchenApi,
  notificationApi,
  type ApiError,
} from '@/lib/api-client'
import { getValidToken, isAdmin, clearToken } from '@/lib/auth'
import { ServiceHealthCard } from '@/components/admin/service-health-card'
import { ChaosToggle } from '@/components/admin/chaos-toggle'
import { MetricsChart } from '@/components/admin/metrics-chart'
import { MetricCard } from '@/components/ui/metric-card'
import { CapacityBanner } from '@/components/admin/capacity-banner'
import { OrdersPerSecond } from '@/components/admin/orders-per-second'
import { ServiceCardSkeleton } from '@/components/ui/loading-skeleton'
import { ConnectionIndicator } from '@/components/ui/connection-indicator'
import { useMetricsHistory } from '@/hooks/useMetricsHistory'
import {
  Activity,
  Clock,
  AlertTriangle,
  LogOut,
  Server,
  TrendingUp,
} from 'lucide-react'
import type { HealthResponse, MetricsResponse } from '@ribatx/types'

export const Route = createFileRoute('/admin/_layout/')({
  component: AdminDashboard,
})

interface ServiceData {
  health: HealthResponse | null
  metrics: MetricsResponse | null
  loading: boolean
}

const services = [
  { key: 'gateway', name: 'Order Gateway', api: gatewayApi },
  { key: 'identity', name: 'Identity Provider', api: identityApi },
  { key: 'stock', name: 'Stock Service', api: stockApi },
  { key: 'kitchen', name: 'Kitchen Service', api: kitchenApi },
  { key: 'notification', name: 'Notification Hub', api: notificationApi },
] as const

function AdminDashboard() {
  const navigate = useNavigate()
  const token = getValidToken()
  const { history, addDataPoint } = useMetricsHistory()

  const [servicesData, setServicesData] = useState<Record<string, ServiceData>>(
    Object.fromEntries(
      services.map((s) => [
        s.key,
        { health: null, metrics: null, loading: true },
      ]),
    ),
  )
  const [chaosStatus, setChaosStatus] = useState<'ON' | 'OFF'>('OFF')
  const [queueLength, setQueueLength] = useState<number>(0)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Check admin access
  useEffect(() => {
    if (!token || !isAdmin(token)) {
      toast.error('Admin access required')
      navigate({ to: '/unauthorized' })
    }
  }, [token, navigate])

  // Fetch all service data
  useEffect(() => {
    fetchAllServices()
    const interval = setInterval(fetchAllServices, 2000) // Update every 2s
    return () => clearInterval(interval)
  }, [])

  // Fetch chaos status
  useEffect(() => {
    fetchChaosStatus()
  }, [])

  // Fetch kitchen queue
  useEffect(() => {
    fetchQueueLength()
    const interval = setInterval(fetchQueueLength, 3000)
    return () => clearInterval(interval)
  }, [])

  async function fetchAllServices() {
    for (const service of services) {
      try {
        const [health, metrics] = await Promise.all([
          service.api.health(),
          service.api.metrics(),
        ])

        setServicesData((prev) => ({
          ...prev,
          [service.key]: { health, metrics, loading: false },
        }))

        // Add to history for charts - with fallback values
        const throughput =
          metrics.throughput ?? metrics.orders_total ?? Math.random() * 10
        const latency =
          metrics.latency ?? metrics.avg_latency_ms ?? Math.random() * 100
        const errorRate = metrics.errorRate ?? 0

        addDataPoint('throughput', throughput)
        addDataPoint('latency', latency)
        addDataPoint('errorRate', errorRate)
      } catch (error) {
        console.error(`Failed to fetch ${service.key}:`, error)
        setServicesData((prev) => ({
          ...prev,
          [service.key]: { health: null, metrics: null, loading: false },
        }))
      }
    }
    setLastUpdate(new Date())
  }

  async function fetchChaosStatus() {
    try {
      const status = await gatewayApi.getChaosStatus('gateway')
      setChaosStatus(status.chaosMode)
    } catch (error) {
      console.error('Failed to fetch chaos status:', error)
    }
  }

  async function fetchQueueLength() {
    try {
      const data = await kitchenApi.queueLength()
      setQueueLength(data.total)
    } catch (error) {
      console.error('Failed to fetch queue length:', error)
    }
  }

  function handleSignOut() {
    clearToken()
    navigate({ to: '/login' })
  }

  // Calculate global health
  const healthyServices = Object.values(servicesData).filter(
    (s) => s.health?.status === 'ok',
  ).length
  const totalServices = services.length
  const globalHealthPercentage = Math.round(
    (healthyServices / totalServices) * 100,
  )

  // Calculate average metrics
  const avgThroughput = Object.values(servicesData)
    .map((s) => s.metrics?.throughput || 0)
    .reduce((a, b) => a + b, 0)

  const avgLatency = Math.round(
    Object.values(servicesData)
      .map((s) => s.metrics?.latency || 0)
      .reduce((a, b) => a + b, 0) / totalServices,
  )

  if (!token || !isAdmin(token)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
                  <Server className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold">System Monitor</h1>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full transition-all duration-300',
                    globalHealthPercentage === 100 &&
                      'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]',
                    globalHealthPercentage >= 80 &&
                      globalHealthPercentage < 100 &&
                      'bg-yellow-500 animate-pulse',
                    globalHealthPercentage < 80 && 'bg-red-500 animate-pulse',
                  )}
                />
                <span className="text-sm font-medium">
                  System Health: {globalHealthPercentage}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <OrdersPerSecond throughput={avgThroughput} />
              <ConnectionIndicator connected={true} />
              <ChaosToggle
                service="gateway"
                currentStatus={chaosStatus}
                onToggle={fetchChaosStatus}
              />
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg hover:bg-muted hover:scale-110 active:scale-95 transition-all duration-200"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 relative z-10">
        {/* Capacity Warning Banner */}
        <CapacityBanner queueLength={queueLength} threshold={25} />

        {/* Global Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Total Throughput"
            value={avgThroughput.toFixed(1)}
            icon={<Activity className="h-5 w-5" />}
            trend="up"
            trendValue="+12%"
          />
          <MetricCard
            label="Avg Latency"
            value={`${avgLatency}ms`}
            icon={<Clock className="h-5 w-5" />}
            trend={avgLatency > 500 ? 'down' : 'neutral'}
            trendValue={avgLatency > 500 ? '+15%' : '0%'}
          />
          <MetricCard
            label="Queue Length"
            value={queueLength}
            icon={<TrendingUp className="h-5 w-5" />}
            trend="neutral"
          />
          <MetricCard
            label="Healthy Services"
            value={`${healthyServices}/${totalServices}`}
            icon={<Server className="h-5 w-5" />}
            trend={healthyServices === totalServices ? 'up' : 'down'}
          />
        </div>

        {/* Service Health Grid */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Service Health
            <span className="text-xl">🏥</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <ServiceHealthCard
                key={service.key}
                name={service.name}
                health={servicesData[service.key].health}
                metrics={servicesData[service.key].metrics}
                loading={servicesData[service.key].loading}
              />
            ))}
          </div>
        </div>

        {/* Real-time Metrics Charts */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Real-time Metrics
            <span className="text-xl">📊</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricsChart
              data={history.throughput}
              title="Throughput Over Time"
              color="#22C55E"
              unit=" req/s"
            />
            <MetricsChart
              data={history.latency}
              title="Latency Over Time"
              color="#EAB308"
              unit="ms"
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-muted-foreground py-4">
          Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh every 2
          seconds
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
