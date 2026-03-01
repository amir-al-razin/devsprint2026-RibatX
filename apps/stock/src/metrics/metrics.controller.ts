import { Controller, Get } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Controller('metrics')
export class MetricsController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get()
  async getMetrics() {
    const uptime_seconds = Math.floor(process.uptime());

    const reserveRaw = await this.redis.get(
      'metrics:throughput:POST:/stock/reserve',
    );
    const requests_total = parseInt(reserveRaw ?? '0', 10);

    const samples = await this.redis.lrange(
      'metrics:latency:POST:/stock/reserve',
      0,
      -1,
    );
    const durations = samples.map(Number).filter((n) => !isNaN(n));
    const avg_latency_ms =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return {
      uptime_seconds,
      requests_total,
      avg_latency_ms,
      service: 'stock',
    };
  }
}
