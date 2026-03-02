import {
  BadGatewayException,
  Controller,
  Get,
  Param,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from './common/guards/roles.guard';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Controller('admin/observability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminObservabilityController {
  constructor(
    private readonly httpService: HttpService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  private serviceUrls(
    service: 'identity' | 'stock' | 'kitchen' | 'notification',
  ) {
    const envMap = {
      identity: process.env.IDENTITY_SERVICE_URL,
      stock: process.env.STOCK_SERVICE_URL,
      kitchen: process.env.KITCHEN_SERVICE_URL,
      notification: process.env.NOTIFICATION_SERVICE_URL,
    } as const;

    const dockerDefaults = {
      identity: 'http://identity:3001',
      stock: 'http://stock:3002',
      kitchen: 'http://kitchen:3003',
      notification: 'http://notification:3004',
    } as const;

    const localhostDefaults = {
      identity: 'http://localhost:3001',
      stock: 'http://localhost:3002',
      kitchen: 'http://localhost:3003',
      notification: 'http://localhost:3004',
    } as const;

    const preferred = envMap[service];

    return preferred
      ? [preferred, localhostDefaults[service]]
      : [dockerDefaults[service], localhostDefaults[service]];
  }

  private async getFromService(
    service: 'identity' | 'stock' | 'kitchen' | 'notification',
    path: string,
  ) {
    const urls = this.serviceUrls(service);
    let lastError: unknown;

    for (const baseUrl of urls) {
      try {
        const res = await firstValueFrom(
          this.httpService.get(`${baseUrl}${path}`, {
            timeout: 5000,
          }),
        );
        return res.data;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Service unavailable');
  }

  @Get('health/:service')
  async getServiceHealth(
    @Param('service')
    service: 'gateway' | 'identity' | 'stock' | 'kitchen' | 'notification',
  ) {
    if (service === 'gateway') {
      const chaos = await this.redis.get('chaos:gateway');
      if (chaos === '1') {
        return { status: 'error', service: 'gateway', chaosMode: 'ON' };
      }
      return { status: 'ok', service: 'gateway' };
    }

    try {
      return await this.getFromService(service, '/health');
    } catch {
      return { status: 'error', service };
    }
  }

  @Get('kitchen/queue/length')
  async getKitchenQueueLength() {
    try {
      return await this.getFromService('kitchen', '/queue/length');
    } catch {
      throw new BadGatewayException('Kitchen service unavailable');
    }
  }

  @Get('kitchen/queue/recent')
  async getKitchenQueueRecent(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    const clampedLimit = Number.isFinite(parsed)
      ? Math.max(1, Math.min(20, Math.floor(parsed)))
      : 10;

    try {
      return await this.getFromService(
        'kitchen',
        `/queue/recent?limit=${clampedLimit}`,
      );
    } catch {
      throw new BadGatewayException('Kitchen service unavailable');
    }
  }

  @Get('stock/items')
  async getStockItems() {
    try {
      return await this.getFromService('stock', '/stock/items');
    } catch {
      throw new BadGatewayException('Stock service unavailable');
    }
  }
}
