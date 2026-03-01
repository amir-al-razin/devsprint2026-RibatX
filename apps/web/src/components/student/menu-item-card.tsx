import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import { Package, Loader2, ShoppingCart, Sparkles } from 'lucide-react'
import type { StockItem } from '@ribatx/types'

export interface MenuItemCardProps {
  item: StockItem
  onOrder: (itemId: string) => void
  disabled?: boolean
  isOrdering?: boolean
}

export function MenuItemCard({
  item,
  onOrder,
  disabled,
  isOrdering,
}: MenuItemCardProps) {
  const isOutOfStock = item.quantity === 0
  const isLowStock = item.quantity > 0 && item.quantity <= 5
  const isPopular = item.quantity > 40 // Popular items have high stock

  return (
    <div className="group relative h-full">
      {/* Glow effect on hover */}
      <div
        className={cn(
          'absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500',
          isOutOfStock
            ? 'bg-gradient-to-r from-muted to-muted/50'
            : 'bg-gradient-to-r from-primary to-primary/50',
        )}
      />

      <div
        className={cn(
          'relative h-full rounded-2xl border bg-card/95 backdrop-blur-xl overflow-hidden transition-all duration-300',
          'hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]',
          isOutOfStock && 'opacity-60 grayscale',
        )}
      >
        {/* Image Section */}
        <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
          </div>

          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
            <Package className="h-10 w-10 text-primary" />
          </div>

          {/* Popular badge */}
          {isPopular && !isOutOfStock && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/90 backdrop-blur-sm text-yellow-50 text-xs font-semibold shadow-lg">
              <Sparkles className="h-3 w-3" />
              <span>Popular</span>
            </div>
          )}

          {/* Stock badge */}
          <div className="absolute top-3 right-3">
            {isOutOfStock ? (
              <StatusBadge variant="error">Out of Stock</StatusBadge>
            ) : isLowStock ? (
              <StatusBadge variant="warning" pulse>
                Only {item.quantity} left
              </StatusBadge>
            ) : (
              <StatusBadge variant="success">In Stock</StatusBadge>
            )}
          </div>

          {/* Decorative corner */}
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-primary/10 to-transparent rounded-tl-full" />
        </div>

        {/* Content Section */}
        <div className="p-5 space-y-4">
          {/* Title and quantity */}
          <div>
            <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span>{item.quantity} available</span>
            </div>
          </div>

          {/* Price and Order Button */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Price</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                ৳{item.price}
              </span>
            </div>

            <button
              onClick={() => onOrder(item.id)}
              disabled={disabled || isOutOfStock || isOrdering}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'min-h-[44px]', // Thumb-friendly
                isOutOfStock || disabled
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95',
              )}
            >
              {isOrdering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ordering...</span>
                </>
              ) : isOutOfStock ? (
                <span>Unavailable</span>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Order Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      </div>
    </div>
  )
}
