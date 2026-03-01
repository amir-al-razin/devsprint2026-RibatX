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
      const parsed = JSON.parse(result);
      if (parsed.status === 'PROCESSING') {
        throw new ConflictException('Request is still being processed');
      }
      return parsed; // Return the actual cached response
    }

    // Lock it temporarily (the actual service will update it with the result)
    await this.redis.set(
      key,
      JSON.stringify({ status: 'PROCESSING' }),
      'EX',
      3600,
    );

    return true;
  }
}
