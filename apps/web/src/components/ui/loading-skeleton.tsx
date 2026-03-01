import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'card' | 'text' | 'circle' | 'button'
}

export function Skeleton({
  className,
  variant = 'text',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        variant === 'card' && 'rounded-lg h-32',
        variant === 'text' && 'rounded h-4',
        variant === 'circle' && 'rounded-full',
        variant === 'button' && 'rounded-md h-10',
        className,
      )}
      {...props}
    />
  )
}

export function MenuItemSkeleton() {
  return (
    <div className="rounded-2xl border bg-card/95 backdrop-blur-xl overflow-hidden h-full">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-4">
        <div>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-11 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function ServiceCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton variant="circle" className="h-3 w-3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-4 pt-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}
