import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BullHealthIndicator extends HealthIndicator {
  constructor(@InjectQueue('kitchen-orders') private readonly queue: Queue) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // getJobCounts requires a live Redis connection — throws if Redis is down
      await this.queue.getJobCounts();
      return this.getStatus(key, true);
    } catch (e) {
      throw new HealthCheckError(
        'BullMQ/Redis check failed',
        this.getStatus(key, false),
      );
    }
  }
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly bullIndicator: BullHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.bullIndicator.isHealthy('queue')]);
  }
}
