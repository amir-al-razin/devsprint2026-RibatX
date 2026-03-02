import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class ChaosGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const flag = await this.redis.get('chaos:kitchen');
    if (flag === '1') {
      throw new ServiceUnavailableException('kitchen service is in chaos mode');
    }
    return true;
  }
}
