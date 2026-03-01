import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: React.ReactNode
  loading?: boolean
}

export function MetricCard({
  label,
  value,
  trend,
  trendValue,
  icon,
  loading,
  className,
  ...props
}: MetricCardProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-md',
        loading && 'animate-pulse',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        )}
      </div>

      {trend && trendValue && !loading && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <TrendIcon
            className={cn(
              'h-3.5 w-3.5',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-muted-foreground',
            )}
          />
          <span
            className={cn(
              'font-medium',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-muted-foreground',
            )}
          >
            {trendValue}
          </span>
          <span className="text-muted-foreground">from last hour</span>
        </div>
      )}
    </div>
  )
}
