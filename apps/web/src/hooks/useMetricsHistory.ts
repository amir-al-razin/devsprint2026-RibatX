import { useState, useEffect, useRef } from 'react'

export interface MetricDataPoint {
  timestamp: number
  value: number
}

export interface MetricsHistory {
  throughput: MetricDataPoint[]
  latency: MetricDataPoint[]
  errorRate: MetricDataPoint[]
}

const MAX_POINTS = 20 // Keep last 20 data points

export function useMetricsHistory() {
  const [history, setHistory] = useState<MetricsHistory>({
    throughput: [],
    latency: [],
    errorRate: [],
  })

  const addDataPoint = (metric: keyof MetricsHistory, value: number) => {
    setHistory((prev) => {
      const newPoints = [
        ...prev[metric],
        { timestamp: Date.now(), value },
      ].slice(-MAX_POINTS)

      return {
        ...prev,
        [metric]: newPoints,
      }
    })
  }

  return { history, addDataPoint }
}
