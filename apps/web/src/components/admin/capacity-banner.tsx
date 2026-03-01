import { cn } from '@/lib/utils'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

export interface CapacityBannerProps {
  queueLength: number
  threshold?: number
}

export function CapacityBanner({
  queueLength,
  threshold = 20,
}: CapacityBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const capacityPercentage = Math.min((queueLength / threshold) * 100, 100)
  const isWarning = capacityPercentage >= 80
  const isCritical = capacityPercentage >= 95

  if (!isWarning || dismissed) return null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg p-4 mb-6 animate-in slide-in-from-top-4 duration-500',
        isCritical
          ? 'bg-red-500/10 border border-red-500/20'
          : 'bg-yellow-500/10 border border-yellow-500/20',
      )}
    >
      {/* Animated background pulse */}
      <div
        className={cn(
          'absolute inset-0 animate-pulse',
          isCritical ? 'bg-red-500/5' : 'bg-yellow-500/5',
        )}
      />

      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            'rounded-full p-2 flex-shrink-0',
            isCritical ? 'bg-red-500/20' : 'bg-yellow-500/20',
          )}
        >
          <AlertTriangle
            className={cn(
              'h-5 w-5',
              isCritical ? 'text-red-500' : 'text-yellow-500',
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-semibold mb-1',
              isCritical ? 'text-red-500' : 'text-yellow-500',
            )}
          >
            {isCritical
              ? 'Critical: System at Capacity'
              : 'Warning: High System Load'}
          </h3>
          <p className="text-sm text-muted-foreground">
            System is running at{' '}
            <span className="font-bold tabular-nums">
              {capacityPercentage.toFixed(0)}%
            </span>{' '}
            capacity with{' '}
            <span className="font-bold tabular-nums">{queueLength}</span> orders
            in queue.
            {isCritical
              ? ' Consider enabling additional kitchen capacity.'
              : ' Monitor closely during rush hours.'}
          </p>

          {/* Capacity bar */}
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                isCritical ? 'bg-red-500' : 'bg-yellow-500',
              )}
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
