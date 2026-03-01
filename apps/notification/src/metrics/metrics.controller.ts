import { Controller, Get } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Controller('metrics')
export class MetricsController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get()
  async getMetrics() {
    const uptime_seconds = Math.floor(process.uptime());

    const notifyRaw = await this.redis.get(
      'metrics:throughput:PATCH:/notify/.*',
    );
    const requests_total = parseInt(notifyRaw ?? '0', 10);

    return {
      uptime_seconds,
      requests_total,
      service: 'notification',
    };
  }
}
