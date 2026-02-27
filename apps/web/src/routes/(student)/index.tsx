import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { OrderStatus } from '@ribatx/types'
import { gatewayApi, kitchenApi } from '@/lib/api-client'
import { getValidToken, getStudentId } from '@/lib/auth'
import { useOrderStatus } from '@/hooks/useOrderStatus'
import { useMetricsPoller } from '@/hooks/useMetricsPoller'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Hardcoded item from the seed — "Iftar Box" seeded by apps/stock
const IFTAR_BOX_ITEM_ID = import.meta.env.VITE_IFTAR_ITEM_ID ?? 'iftar-box'

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

function stepColor(
  stepIdx: number,
  currentIdx: number,
  isFailed: boolean,
): string {
  if (isFailed)
    return 'bg-destructive/20 text-destructive border-destructive/30'
  if (stepIdx < currentIdx)
    return 'bg-green-100 text-green-800 border-green-300'
  if (stepIdx === currentIdx) {
    if (currentIdx === 3)
      return 'animate-pulse bg-green-400 text-white border-green-500'
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }
  return 'bg-muted text-muted-foreground border-transparent'
}

export const Route = createFileRoute('/(student)/')({
  component: OrderDashboard,
})

function OrderDashboard() {
  const token = getValidToken()
  const studentId = token ? getStudentId(token) : null

  const [orderId, setOrderId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)

  const orderState = useOrderStatus(orderId, studentId)
  const queueData = useMetricsPoller<{ length: number }>(
    '/api/queue/length',
    5000,
  )

  const currentStatus =
    orderState?.status ?? (placed ? OrderStatus.PENDING : null)
  const currentIdx = currentStatus ? STATUS_INDEX[currentStatus] : -1
  const isFailed = currentStatus === OrderStatus.FAILED

  const handleOrder = useCallback(async () => {
    if (placing || placed) return
    setPlacing(true)
    // Optimistic: show button as "Placing..."
    const idempotencyKey = `${studentId}-${Date.now()}`
    try {
      const res = await gatewayApi.placeOrder(IFTAR_BOX_ITEM_ID, idempotencyKey)
      setOrderId(res.orderId)
      setPlaced(true)
      toast.success('Order placed! Waiting for kitchen…')
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 409) {
        toast.error('Sorry, this item is sold out.')
      } else if (status === 401) {
        toast.error('Session expired. Please log in again.')
      } else {
        toast.error('Order failed. Please try again.')
      }
    } finally {
      setPlacing(false)
    }
  }, [placing, placed, studentId])

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
        {queueData && queueData.length > 0 && (
          <Badge variant="outline" className="text-xs">
            #{queueData.length} in queue
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
            disabled={placing || placed}
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
