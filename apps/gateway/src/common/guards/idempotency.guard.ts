import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ConflictException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['x-idempotency-key'];

    if (!idempotencyKey) {
      return true; // Optionally require it, or skip if not provided.
    }

    const key = `idempotency:${idempotencyKey}`;
    const result = await this.redis.get(key);

    if (result) {
      // If we have a cached result, return it (mocking the actual response here)
      // In a real scenario, you'd store the actual response body.
      throw new ConflictException({
        message: 'Duplicate request detected (Idempotent)',
        cachedResult: JSON.parse(result),
      });
    }

    // Lock it temporarily (the actual service will update it with the result)
    await this.redis.set(key, JSON.stringify({ status: 'PROCESSING' }), 'EX', 3600);

    return true;
  }
}
