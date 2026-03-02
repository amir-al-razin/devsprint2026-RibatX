import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const NOTIFICATION_HUB_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_NOTIFICATION_URL ?? 'http://localhost:3004'

/**
 * Opens a persistent Socket.io connection to the Notification Hub.
 * Emits a `join` event with the student's ID so the server can route to the
 * correct room (`student:{studentId}`).
 *
 * The socket is created once per studentId and torn down on unmount.
 */
export function useSocket(studentId: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!studentId) return

    const socket = io(NOTIFICATION_HUB_URL, {
      transports: ['websocket'],
      path: '/socket.io',
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join', { studentId })
    })
    socket.on('disconnect', () => setConnected(false))

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [studentId])

  return { socket: socketRef.current, connected }
}
