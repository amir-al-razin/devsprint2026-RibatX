import { cn } from '@/lib/utils'
import { Wifi, WifiOff } from 'lucide-react'

export interface ConnectionIndicatorProps {
  connected: boolean
  className?: string
}

export function ConnectionIndicator({
  connected,
  className,
}: ConnectionIndicatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
        connected
          ? 'bg-green-500/10 text-green-500'
          : 'bg-red-500/10 text-red-500',
        className,
      )}
    >
      {connected ? (
        <>
          <div className="relative">
            <Wifi className="h-3.5 w-3.5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline</span>
        </>
      )}
    </div>
  )
}
