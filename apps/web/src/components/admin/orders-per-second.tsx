import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

export interface OrdersPerSecondProps {
  throughput: number
  className?: string
}

export function OrdersPerSecond({
  throughput,
  className,
}: OrdersPerSecondProps) {
  const [displayValue, setDisplayValue] = useState(throughput)
  const [isIncreasing, setIsIncreasing] = useState(false)

  useEffect(() => {
    if (throughput > displayValue) {
      setIsIncreasing(true)
      setTimeout(() => setIsIncreasing(false), 500)
    }
    setDisplayValue(throughput)
  }, [throughput])

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-gradient-to-r from-primary/10 to-primary/5',
        'border border-primary/20 transition-all duration-300',
        isIncreasing && 'scale-110 shadow-lg shadow-primary/20',
        className,
      )}
    >
      <TrendingUp
        className={cn(
          'h-4 w-4 text-primary transition-transform duration-300',
          isIncreasing && 'scale-125',
        )}
      />
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'text-2xl font-bold tabular-nums text-primary transition-all duration-300',
            isIncreasing && 'text-3xl',
          )}
        >
          {displayValue.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          orders/sec
        </span>
      </div>
    </div>
  )
}
