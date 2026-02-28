import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { OrderStatus } from '@ribatx/types'
import { gatewayApi, kitchenApi, stockApi } from '@/lib/api-client'
import { getValidToken, getStudentId } from '@/lib/auth'
import { useOrderStatus } from '@/hooks/useOrderStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─── Step tracker ────────────────────────────────────────────────────────────

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: OrderStatus.PENDING, label: 'Pending' },
  { status: OrderStatus.STOCK_VERIFIED, label: 'Stock Verified' },
  { status: OrderStatus.IN_KITCHEN, label: 'In Kitchen' },
  { status: OrderStatus.READY, label: 'Ready' },
]

const STATUS_INDEX: Record<OrderStatus, number> = {
  [OrderStatus.PENDING]: 0,
  [OrderStatus.STOCK_VERIFIED]: 1,
  [OrderStatus.IN_KITCHEN]: 2,
  [OrderStatus.READY]: 3,
  [OrderStatus.FAILED]: -1,
}

function stepColor(idx: number, currentIdx: number, isFailed: boolean) {
  if (isFailed)
    return 'bg-destructive/20 text-destructive border-destructive/30'
  if (idx < currentIdx) return 'bg-green-100 text-green-800 border-green-300'
  if (idx === currentIdx) {
    if (currentIdx === 3)
      return 'animate-pulse bg-green-400 text-white border-green-500'
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }
  return 'bg-muted text-muted-foreground border-transparent'
}

export const Route = createFileRoute('/(student)/_layout/')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return // SSR: skip
    const token = getValidToken()
    if (!token) throw redirect({ to: '/login' })
  },
  component: OrderDashboard,
})

function OrderDashboard() {
  const token = getValidToken()
  const studentId = token ? getStudentId(token) : null

  const [orderId, setOrderId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)

  // Fetch actual item ID from stock service on mount (avoids stale env var)
  const [iftarBoxId, setIftarBoxId] = useState<string | null>(null)
  useEffect(() => {
    stockApi
      .items()
      .then((items) => {
        if (items?.[0]?.id) setIftarBoxId(items[0].id)
      })
      .catch(() => {
        /* stock unreachable — order button stays disabled */
      })
  }, [])

  // Poll kitchen queue length directly via kitchenApi (correct URL baked in)
  const [queueData, setQueueData] = useState<{ total: number } | null>(null)
  useEffect(() => {
    const fetchQueue = () =>
      kitchenApi
        .queueLength()
        .then(setQueueData)
        .catch(() => {})
    fetchQueue()
    const id = setInterval(fetchQueue, 5000)
    return () => clearInterval(id)
  }, [])

  const orderState = useOrderStatus(orderId, studentId)

  const currentStatus =
    orderState?.status ?? (placed ? OrderStatus.PENDING : null)
  const currentIdx = currentStatus ? STATUS_INDEX[currentStatus] : -1
  const isFailed = currentStatus === OrderStatus.FAILED

  const handleOrder = useCallback(async () => {
    if (placing || placed || !iftarBoxId) return
    setPlacing(true)
    // Optimistic: show button as "Placing..."
    const idempotencyKey = `${studentId}-${Date.now()}`
    try {
      const res = await gatewayApi.placeOrder(iftarBoxId, idempotencyKey)
      setOrderId(res.orderId)
      setPlaced(true)
      toast.success('Order placed! Waiting for kitchen…')
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      const message = (err as { message?: string }).message ?? ''
      if (status === 409) {
        toast.error('Sorry, this item is sold out.')
      } else if (status === 401) {
        toast.error('Session expired. Please log in again.')
      } else if (status === 503 && message.toLowerCase().includes('chaos')) {
        toast.warning(
          '⚠️ Service is in chaos mode — orders are temporarily disabled.',
        )
      } else if (status === 503) {
        toast.error('A service is unavailable. Please try again shortly.')
      } else {
        toast.error('Order failed. Please try again.')
      }
    } finally {
      setPlacing(false)
    }
  }, [placing, placed, studentId, iftarBoxId])

  // Toast on READY
  useEffect(() => {
    if (currentStatus === OrderStatus.READY) {
      toast.success('🍽️ Your order is ready for pickup!')
    }
  }, [currentStatus])

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Iftar</h1>
        {queueData && queueData.total > 0 && (
          <Badge variant="outline" className="text-xs">
            #{queueData.total} in queue
          </Badge>
        )}
      </div>

      {/* Order button */}
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-4">
          <Button
            size="lg"
            className={cn(
              'w-full text-base transition-all',
              placed && !isFailed && 'bg-green-600 hover:bg-green-700',
            )}
            onClick={handleOrder}
            disabled={placing || placed || !iftarBoxId}
          >
            {placing
              ? 'Placing Order…'
              : placed
                ? 'Order Placed ✓'
                : '🥘 Order Iftar Box'}
          </Button>
          {!placed && (
            <p className="text-xs text-muted-foreground text-center">
              One Iftar Box per session. Pickup at the counter when ready.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status tracker — only shown after order is placed */}
      {placed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isFailed ? (
              <p className="text-sm text-destructive">
                Something went wrong with your order. Please speak to a staff
                member.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                {STEPS.map((step, idx) => (
                  <div
                    key={step.status}
                    className="flex items-center gap-2 flex-1 last:flex-none"
                  >
                    <div
                      className={cn(
                        'flex-1 text-center rounded-full border px-2 py-1 text-xs font-medium transition-all',
                        stepColor(idx, currentIdx, isFailed),
                      )}
                    >
                      {step.label}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'h-px flex-shrink-0 w-3',
                          idx < currentIdx ? 'bg-green-400' : 'bg-border',
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
