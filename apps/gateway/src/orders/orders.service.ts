import {
  Injectable,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRedis() private redis: Redis,
    @InjectQueue('kitchen-orders') private kitchenQueue: Queue,
  ) {}

  /** Throws 503 if chaos mode is active for the given service */
  private async assertNoChaos(service: string) {
    const val = await this.redis.get(`chaos:${service}`);
    if (val === '1') {
      throw new ServiceUnavailableException(
        `${service} service is in chaos mode`,
      );
    }
  }

  async createOrder(
    studentId: string,
    itemId: string,
    idempotencyKey?: string,
  ) {
    // 0. Chaos-mode gates
    await this.assertNoChaos('gateway');
    await this.assertNoChaos('stock');

    // 1. Check Redis cache first (resilience/speed)
    const cachedStock = await this.redis.get(`stock:${itemId}`);
    if (cachedStock !== null) {
      await this.redis.incr('metrics:cache:hits'); // cache served the answer
    } else {
      await this.redis.incr('metrics:cache:misses');
    }
    if (cachedStock === '0') {
      throw new ConflictException('Out of stock (cached)');
    }

    // 2. Call Stock Service to reserve
    try {
      const stockUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:3002';
      const response = await firstValueFrom(
        this.httpService.post(`${stockUrl}/stock/reserve`, { itemId }),
      );

      const orderId = `ORD-${Date.now()}`;

      // 3. Chaos gate for kitchen before enqueue
      await this.assertNoChaos('kitchen');

      // 4. HAND OFF TO KITCHEN QUEUE (Day 2/3 Feature)
      await this.kitchenQueue.add('cook-order', {
        orderId,
        studentId,
        itemId,
      });

      const orderResponse = {
        orderId,
        status: 'PENDING',
        message: 'Order received and sent to kitchen',
      };

      if (idempotencyKey) {
        await this.redis.set(
          `idempotency:${idempotencyKey}`,
          JSON.stringify(orderResponse),
          'EX',
          3600,
        );
      }

      return orderResponse;
    } catch (error) {
      // Re-throw chaos / conflict exceptions as-is
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error.response?.status === 409) {
        throw new ConflictException('Out of stock');
      }
      await this.redis.incr('metrics:orders:failed');
      throw new ServiceUnavailableException('Stock service unavailable');
    }
  }
}
