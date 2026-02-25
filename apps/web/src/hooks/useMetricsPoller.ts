import { useEffect, useRef, useState } from 'react'

/**
 * Polls a URL at the given interval and returns the latest parsed JSON response.
 * Returns null while loading or on error (error is logged to console).
 */
export function useMetricsPoller<T>(url: string, intervalMs: number = 3000): T | null {
  const [data, setData] = useState<T | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const json: T = await res.json()
        if (!cancelled) setData(json)
      } catch (err) {
        console.warn(`[useMetricsPoller] ${url}:`, err)
      }
    }

    poll() // immediate first call
    timerRef.current = setInterval(poll, intervalMs)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [url, intervalMs])

  return data
}
