import { useEffect, useState } from 'react'
import { type OrderStatusEvent, OrderStatus } from '@ribatx/types'
import { useSocket } from './useSocket'

export interface OrderState {
  orderId: string
  status: OrderStatus
  position?: number
}

/**
 * Subscribes to `order:status` Socket.io events for a specific orderId.
 * Resets automatically when orderId changes (new order).
 */
export function useOrderStatus(
  orderId: string | null,
  studentId: string | null,
) {
  const { socket, connected } = useSocket(studentId)
  const [orderState, setOrderState] = useState<OrderState | null>(null)

  // Reset on new order
  useEffect(() => {
    setOrderState(null)
  }, [orderId])

  useEffect(() => {
    if (!socket || !orderId) return

    const handler = (event: OrderStatusEvent) => {
      if (event.orderId === orderId) {
        setOrderState({
          orderId: event.orderId,
          status: event.status,
          position: event.position,
        })
      }
    }

    socket.on('order:status', handler)
    return () => {
      socket.off('order:status', handler)
    }
  }, [socket, orderId, connected])

  return orderState
}
