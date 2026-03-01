import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

export interface MetricDataPoint {
  timestamp: number
  value: number
  label?: string
}

export interface MetricsChartProps {
  data: MetricDataPoint[]
  title: string
  color?: string
  unit?: string
  className?: string
}

export function MetricsChart({
  data,
  title,
  color = '#22C55E',
  unit = '',
  className,
}: MetricsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Return empty array with placeholder if no data
      return []
    }
    return data.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      value: point.value,
    }))
  }, [data])

  const hasData = chartData.length > 0

  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        {hasData && (
          <span className="text-xs text-muted-foreground">
            {chartData.length} data points
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
          <div className="text-center">
            <div className="mb-2">📊</div>
            <p>Collecting data...</p>
            <p className="text-xs mt-1">Charts will appear shortly</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}${unit}`, 'Value']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
