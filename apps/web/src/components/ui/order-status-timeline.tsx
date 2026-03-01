import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Clock, ChefHat, Package } from 'lucide-react'
import { OrderStatus } from '@ribatx/types'

const statusSteps = [
  { status: 'PENDING' as OrderStatus, label: 'Pending', icon: Clock },
  {
    status: 'STOCK_VERIFIED' as OrderStatus,
    label: 'Stock Verified',
    icon: Package,
  },
  { status: 'IN_KITCHEN' as OrderStatus, label: 'In Kitchen', icon: ChefHat },
  { status: 'READY' as OrderStatus, label: 'Ready', icon: CheckCircle2 },
]

export interface OrderStatusTimelineProps {
  currentStatus: OrderStatus
  position?: number
  className?: string
}

export function OrderStatusTimeline({
  currentStatus,
  position,
  className,
}: OrderStatusTimelineProps) {
  const currentIndex = statusSteps.findIndex((s) => s.status === currentStatus)

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />

        {/* Progress bar fill */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
          style={{
            width: `${(currentIndex / (statusSteps.length - 1)) * 100}%`,
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {statusSteps.map((step, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const Icon = step.icon

            return (
              <div key={step.status} className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    isCurrent &&
                      'border-primary bg-background text-primary animate-pulse',
                    !isCompleted &&
                      !isCurrent &&
                      'border-muted bg-background text-muted-foreground',
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center transition-colors duration-200',
                    isCompleted || isCurrent
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {isCurrent && position !== undefined && (
                  <span className="mt-1 text-xs text-muted-foreground">
                    Position: {position}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
