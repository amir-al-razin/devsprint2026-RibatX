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
    const peak_latency_ms = durations.length > 0 ? Math.max(...durations) : 0;
    const sample_count = durations.length;

    return {
      uptime_seconds,
      orders_total,
      avg_latency_ms,
      peak_latency_ms,
      sample_count,
    };
  }
}
