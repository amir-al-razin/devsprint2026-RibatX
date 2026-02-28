import { Controller, Get } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Controller('metrics')
export class MetricsController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get()
  async getMetrics() {
    const uptime_seconds = Math.floor(process.uptime());

    // Orders throughput — incremented by MetricsInterceptor on every POST /orders
    const ordersRaw = await this.redis.get('metrics:throughput:POST:/orders');
    const orders_total = parseInt(ordersRaw ?? '0', 10);

    // Rolling latency samples for POST /orders (last 100)
    const samples = await this.redis.lrange(
      'metrics:latency:POST:/orders',
      0,
      -1,
    );
    const durations = samples.map(Number).filter((n) => !isNaN(n));
    const avg_latency_ms =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
    const sorted = [...durations].sort((a, b) => a - b);
    const p95_latency_ms =
      sorted.length > 0
        ? (sorted[Math.floor(sorted.length * 0.95)] ??
          sorted[sorted.length - 1])
        : 0;

    // Cache stats stored by MetricsInterceptor
    const cacheHitsRaw = await this.redis.get('metrics:cache:hits');
    const cacheMissesRaw = await this.redis.get('metrics:cache:misses');
    const cache_hits = parseInt(cacheHitsRaw ?? '0', 10);
    const cache_misses = parseInt(cacheMissesRaw ?? '0', 10);

    // Failed orders counter
    const failedRaw = await this.redis.get('metrics:orders:failed');
    const orders_failed = parseInt(failedRaw ?? '0', 10);

    return {
      uptime_seconds,
      orders_total,
      orders_failed,
      avg_latency_ms,
      p95_latency_ms,
      cache_hits,
      cache_misses,
    };
  }
}
