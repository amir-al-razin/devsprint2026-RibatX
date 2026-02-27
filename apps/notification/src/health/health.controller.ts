import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';

/**
 * Liveness indicator — if this HTTP endpoint responds, the socket.io
 * server (same process, same port) is alive by definition.
 */
@Injectable()
export class UptimeHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    return this.getStatus(key, true, {
      uptime_seconds: Math.floor(process.uptime()),
    });
  }
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly uptimeIndicator: UptimeHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.uptimeIndicator.isHealthy('service')]);
  }
}
