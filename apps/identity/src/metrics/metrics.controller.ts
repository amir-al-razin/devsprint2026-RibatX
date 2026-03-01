import { Controller, Get } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Controller('metrics')
export class MetricsController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get()
  async getMetrics() {
    const uptime_seconds = Math.floor(process.uptime());

    // Basic throughput for the main endpoint
    const loginRaw = await this.redis.get(
      'metrics:throughput:POST:/auth/login',
    );
    const requests_total = parseInt(loginRaw ?? '0', 10);

    // Rolling latency samples for POST /auth/login (last 100)
    const samples = await this.redis.lrange(
      'metrics:latency:POST:/auth/login',
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
      service: 'identity',
    };
  }
}
