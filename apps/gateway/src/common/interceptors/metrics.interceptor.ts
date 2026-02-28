import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(@InjectRedis() private redis: Redis) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(async () => {
        const delay = Date.now() - now;
        this.logger.log(`${method} ${url} - ${delay}ms`);

        // Log to Redis for Admin Dashboard
        const key = `metrics:latency:${method}:${url}`;
        await this.redis.lpush(key, delay);
        await this.redis.ltrim(key, 0, 99); // Keep last 100 samples
        await this.redis.incr(`metrics:throughput:${method}:${url}`);
      }),
    );
  }
}
