import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import { Activity, Clock, AlertTriangle } from 'lucide-react'
import type { HealthResponse, MetricsResponse } from '@ribatx/types'

export interface ServiceHealthCardProps {
  name: string
  health: HealthResponse | null
  metrics: MetricsResponse | null
  loading?: boolean
  onClick?: () => void
}

export function ServiceHealthCard({
  name,
  health,
  metrics,
  loading,
  onClick,
}: ServiceHealthCardProps) {
  const isHealthy = health?.status === 'ok'
  const hasWarning =
    metrics &&
    ((metrics.errorRate && metrics.errorRate > 5) ||
      (metrics.latency && metrics.latency > 1000))

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-lg border p-6 transition-all duration-200 cursor-pointer',
        'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        isHealthy &&
          !hasWarning &&
          'bg-card hover:ring-2 hover:ring-green-500/20',
        hasWarning && 'bg-card ring-2 ring-yellow-500/20 animate-pulse',
        !isHealthy && 'bg-card ring-2 ring-red-500/20',
        loading && 'animate-pulse',
      )}
    >
      {/* Glow effect for healthy services */}
      {isHealthy && !hasWarning && (
        <div className="absolute inset-0 rounded-lg bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.uptime
                ? `Uptime: ${Math.floor(health.uptime / 1000)}s`
                : 'Checking...'}
            </p>
          </div>

          {loading ? (
            <StatusBadge variant="neutral">Loading</StatusBadge>
          ) : !health ? (
            <StatusBadge variant="error">Offline</StatusBadge>
          ) : hasWarning ? (
            <StatusBadge variant="warning">Warning</StatusBadge>
          ) : (
            <StatusBadge variant="success">Healthy</StatusBadge>
          )}
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                <span>Throughput</span>
              </div>
              <p className="text-lg font-bold tabular-nums">
                {metrics.throughput || 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  req/s
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Latency</span>
              </div>
              <p
                className={cn(
                  'text-lg font-bold tabular-nums',
                  metrics.latency &&
                    metrics.latency > 1000 &&
                    'text-yellow-500',
                )}
              >
                {metrics.latency || 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ms
                </span>
              </p>
            </div>

            {metrics.errorRate !== undefined && (
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Error Rate</span>
                </div>
                <p
                  className={cn(
                    'text-lg font-bold tabular-nums',
                    metrics.errorRate > 5 && 'text-red-500',
                  )}
                >
                  {metrics.errorRate.toFixed(2)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    %
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Last check timestamp */}
        {health && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Last check: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}
