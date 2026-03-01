import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  XCircle,
} from 'lucide-react'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        success: 'bg-green-500/10 text-green-500 ring-1 ring-green-500/20',
        warning:
          'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/20 animate-pulse',
        error: 'bg-red-500/10 text-red-500 ring-1 ring-red-500/20',
        pending: 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20',
        neutral: 'bg-muted text-muted-foreground ring-1 ring-border',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

const iconMap = {
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
  pending: Loader2,
  neutral: Clock,
}

export interface StatusBadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  icon?: React.ComponentType<{ className?: string }>
  pulse?: boolean
}

export function StatusBadge({
  className,
  variant,
  icon,
  pulse,
  children,
  ...props
}: StatusBadgeProps) {
  const Icon = icon || iconMap[variant || 'neutral']

  return (
    <div
      className={cn(
        statusBadgeVariants({ variant }),
        pulse && 'animate-pulse',
        className,
      )}
      {...props}
    >
      <Icon
        className={cn('h-3.5 w-3.5', variant === 'pending' && 'animate-spin')}
      />
      {children}
    </div>
  )
}
