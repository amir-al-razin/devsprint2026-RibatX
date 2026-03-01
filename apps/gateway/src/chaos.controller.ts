import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from './common/guards/roles.guard';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Controller('admin/chaos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ChaosController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // POST /admin/chaos { service: 'stock', enabled: true }
  @Post()
  async toggleChaos(@Body() body: { service: string; enabled: boolean }) {
    const key = `chaos:${body.service}`;
    if (body.enabled) {
      await this.redis.set(key, '1');
    } else {
      await this.redis.del(key);
    }
    return { service: body.service, chaosMode: body.enabled ? 'ON' : 'OFF' };
  }

  // GET /admin/chaos/status?service=stock
  @Get('status')
  async getStatus(@Query('service') service: string) {
    if (!service) {
      return { error: 'service query param required' };
    }
    const value = await this.redis.get(`chaos:${service}`);
    return { service, chaosMode: value === '1' ? 'ON' : 'OFF' };
  }

  async isChaosEnabled(service: string): Promise<boolean> {
    const value = await this.redis.get(`chaos:${service}`);
    return value === '1';
  }
}
