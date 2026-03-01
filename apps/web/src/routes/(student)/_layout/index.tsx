import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { stockApi, gatewayApi } from '@/lib/api-client'
import {
  getValidToken,
  getStudentId,
  getStudentName,
  clearToken,
} from '@/lib/auth'
import { useOrderStatus } from '@/hooks/useOrderStatus'
import { MenuItemCard } from '@/components/student/menu-item-card'
import { MenuItemSkeleton } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ConnectionIndicator } from '@/components/ui/connection-indicator'
import { OrderStatusTimeline } from '@/components/ui/order-status-timeline'
import { Confetti } from '@/components/ui/confetti'
import { useSocket } from '@/hooks/useSocket'
import {
  Package,
  LogOut,
  CheckCircle2,
  X,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StockItem } from '@ribatx/types'

export const Route = createFileRoute('/(student)/_layout/')({
  component: StudentDashboard,
})

function StudentDashboard() {
  const navigate = useNavigate()
  const token = getValidToken()
  const studentId = token ? getStudentId(token) : null
  const studentName = token ? getStudentName(token) : null

  const { connected } = useSocket(studentId)

  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [orderingItemId, setOrderingItemId] = useState<string | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const orderState = useOrderStatus(currentOrderId, studentId)

  // Fetch menu items
  useEffect(() => {
    loadItems()
    const interval = setInterval(loadItems, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])

  async function loadItems() {
    try {
      const data = await stockApi.items()
      setItems(data)
    } catch (error) {
      console.error('Failed to load items:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleOrder(itemId: string) {
    if (!token || orderingItemId) return

    setOrderingItemId(itemId)
    const idempotencyKey = `${studentId}-${Date.now()}`

    try {
      const order = await gatewayApi.placeOrder(itemId, idempotencyKey)
      setCurrentOrderId(order.orderId)
      setShowOrderModal(true)
      setShowConfetti(true)

      // Show success toast with confetti feel
      toast.success('Order placed successfully!', {
        description: 'Track your order status below',
        duration: 3000,
      })

      // Refresh items to show updated stock
      loadItems()
    } catch (error: any) {
      toast.error('Failed to place order', {
        description: error.message || 'Please try again',
      })
    } finally {
      setOrderingItemId(null)
    }
  }

  function handleSignOut() {
    clearToken()
    navigate({ to: '/login' })
  }

  if (!token) {
    navigate({ to: '/login' })
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <Confetti
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
                <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  Welcome, {studentName}
                  <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Choose your delicious meal 🌙
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ConnectionIndicator connected={connected} />
              <button
                onClick={handleSignOut}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  'hover:bg-muted hover:scale-110 active:scale-95',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                )}
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 relative z-10">
        {/* Active Order Status */}
        {currentOrderId && orderState && showOrderModal && (
          <div className="mb-8 relative group">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500" />

            <div className="relative p-6 sm:p-8 rounded-2xl border bg-card/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Your Order</h2>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <OrderStatusTimeline
                currentStatus={orderState.status}
                position={orderState.position}
              />

              {orderState.status === 'READY' && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-500">
                      Your order is ready!
                    </p>
                    <p className="text-sm text-green-500/80 mt-0.5">
                      Please collect from the counter
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menu Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                Today's Menu
                <span className="text-2xl">🍽️</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Fresh and delicious meals prepared with care
              </p>
            </div>
            {!loading && items.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium text-primary">
                  {items.length} items available
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <MenuItemSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur" />
              <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl border p-12">
                <EmptyState
                  icon={Package}
                  title="No items available"
                  description="The menu is currently empty. Please check back later or contact the cafeteria."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MenuItemCard
                    item={item}
                    onOrder={handleOrder}
                    disabled={!!orderingItemId}
                    isOrdering={orderingItemId === item.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
