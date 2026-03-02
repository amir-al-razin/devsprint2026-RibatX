import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private parseCachedResult(raw: string) {
    try {
      return JSON.parse(raw);
    } catch {
      return { status: 'PROCESSING' };
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawHeader = request.headers['x-idempotency-key'];
    const idempotencyKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!idempotencyKey) {
      return true; // Optionally require it, or skip if not provided.
    }

    const key = `idempotency:${idempotencyKey}`;
    const processingPayload = JSON.stringify({ status: 'PROCESSING' });

    // Atomic lock acquisition. Only one concurrent request can claim the key.
    const acquired = await this.redis.set(
      key,
      processingPayload,
      'EX',
      3600,
      'NX',
    );

    if (acquired === 'OK') {
      return true;
    }

    const result = await this.redis.get(key);
    const response = context.switchToHttp().getResponse();

    response
      .status(200)
      .json(result ? this.parseCachedResult(result) : { status: 'PROCESSING' });

    return false;
  }
}
