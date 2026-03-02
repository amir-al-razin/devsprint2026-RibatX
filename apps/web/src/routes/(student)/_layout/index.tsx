import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Package, Utensils, CheckCircle2, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OrderStatus } from '@ribatx/types'
import { gatewayApi, kitchenApi, stockApi } from '@/lib/api-client'
import { getValidToken, getStudentId } from '@/lib/auth'
import { useOrderStatus } from '@/hooks/useOrderStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─── Step tracker ────────────────────────────────────────────────────────────

const STEPS: { status: OrderStatus; label: string; icon: LucideIcon }[] = [
  { status: OrderStatus.PENDING, label: 'Pending', icon: Clock },
  { status: OrderStatus.STOCK_VERIFIED, label: 'Verified', icon: Package },
  { status: OrderStatus.IN_KITCHEN, label: 'Cooking', icon: Utensils },
  { status: OrderStatus.READY, label: 'Ready', icon: CheckCircle2 },
]

const STATUS_INDEX: Record<OrderStatus, number> = {
  [OrderStatus.PENDING]: 0,
  [OrderStatus.STOCK_VERIFIED]: 1,
  [OrderStatus.IN_KITCHEN]: 2,
  [OrderStatus.READY]: 3,
  [OrderStatus.FAILED]: -1,
}

function stepColor(idx: number, currentIdx: number, isFailed: boolean) {
  if (isFailed) return 'bg-destructive/10 text-destructive'
  if (idx < currentIdx) return 'bg-secondary text-foreground'
  if (idx === currentIdx) {
    if (currentIdx === 3) return 'bg-primary text-primary-foreground'
    return 'bg-primary/85 text-primary-foreground'
  }
  return 'bg-secondary text-muted-foreground'
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
  const progressPercent =
    currentIdx >= 0 ? Math.min(100, ((currentIdx + 1) / STEPS.length) * 100) : 0

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto min-h-[calc(100vh-9rem)] flex flex-col justify-center gap-7"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Iftar</h1>
        {queueData && queueData.total > 0 && (
          <Badge variant="secondary" className="text-xs">
            #{queueData.total} in queue
          </Badge>
        )}
      </div>

      {/* Order button */}
      <Card className="bg-card/95">
        <CardContent className="pt-7 flex flex-col items-center gap-4">
          <motion.div
            whileTap={{ scale: 0.985 }}
            animate={placing ? { scale: [1, 0.992, 1] } : { scale: 1 }}
            transition={{ duration: 0.9, repeat: placing ? Infinity : 0 }}
            className="w-full"
          >
            <Button
              size="lg"
              className={cn(
                'w-full text-base transition-colors',
                placed && !isFailed && 'bg-primary hover:bg-primary/88',
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
          </motion.div>
          {!placed && (
            <p className="text-xs text-muted-foreground text-center">
              One Iftar Box per session. Pickup at the counter when ready.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status tracker — only shown after order is placed */}
      {placed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="text-base">Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isFailed ? (
                <p className="text-sm text-destructive">
                  Something went wrong with your order. Please speak to a staff
                  member.
                </p>
              ) : (
                <>
                  <div className="h-1.5 w-full bg-secondary rounded-md overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{
                        type: 'spring',
                        stiffness: 120,
                        damping: 24,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {STEPS.map((step, idx) => (
                      <motion.div
                        key={step.status}
                        className="flex items-center gap-2 flex-1 last:flex-none"
                        initial={{ opacity: 0.55 }}
                        animate={{ opacity: idx <= currentIdx ? 1 : 0.55 }}
                      >
                        <motion.div
                          className={cn(
                            'flex items-center justify-center gap-1.5 flex-1 text-center rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                            stepColor(idx, currentIdx, isFailed),
                          )}
                          animate={
                            idx === currentIdx
                              ? { scale: [1, 1.04, 1] }
                              : { scale: 1 }
                          }
                          transition={{ duration: 0.35 }}
                        >
                          <step.icon size={13} />
                          {step.label}
                        </motion.div>
                        {idx < STEPS.length - 1 && (
                          <div
                            className={cn(
                              'h-px flex-shrink-0 w-3',
                              idx < currentIdx ? 'bg-primary/55' : 'bg-muted',
                            )}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
