import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const studentId = request.body.studentId;

    if (!studentId) {
      return true; // Let the DTO validation handle missing studentId
    }

    const key = `rate_limit:login:${studentId}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, 60);
    }

    if (attempts > 3) {
      throw new HttpException('Too many login attempts. Try again in 60s.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
