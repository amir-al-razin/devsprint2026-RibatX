import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
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
      // Duplicate request — return the cached response with 200 (idempotent)
      const response = context.switchToHttp().getResponse();
      response.status(200).json(JSON.parse(result));
      return false;
    }

    // First time — lock the key with a PROCESSING placeholder so concurrent
    // duplicates also get a clean response. Service will overwrite this with
    // the real result once the order is created.
    await this.redis.set(
      key,
      JSON.stringify({ status: 'PROCESSING' }),
      'EX',
      3600,
    );

    return true;
  }
}
