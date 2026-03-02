import {
  Injectable,
  ConflictException,
  ServiceUnavailableException,
  NotFoundException,
  UnauthorizedException,
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

  private readonly internalApiKey = process.env.INTERNAL_API_KEY;

  verifyInternalApiKey(provided?: string) {
    if (!this.internalApiKey) {
      return;
    }
    if (!provided || provided !== this.internalApiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }
  }

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
    const pendingAt = new Date().toISOString();

    // 0. Chaos-mode gates
    await this.assertNoChaos('gateway');
    await this.assertNoChaos('kitchen');
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
      const traceId = `TRC-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      // 4. HAND OFF TO KITCHEN QUEUE (Day 2/3 Feature)
      await this.kitchenQueue.add('cook-order', {
        orderId,
        traceId,
        studentId,
        itemId,
      });

      const orderResult = {
        orderId,
        status: 'STOCK_VERIFIED',
        message: 'Order received and sent to kitchen',
      };

      // 5. Persist order in Redis so GET /orders/:id can look it up
      const verifiedAt = new Date().toISOString();
      const orderPayload = {
        orderId,
        traceId,
        status: 'STOCK_VERIFIED',
        studentId,
        itemId,
        createdAt: new Date().toISOString(),
        timeline: [
          {
            status: 'PENDING',
            at: pendingAt,
            source: 'gateway',
            traceId,
          },
          {
            status: 'STOCK_VERIFIED',
            at: verifiedAt,
            source: 'gateway',
            traceId,
          },
        ],
      };
      await this.redis.setex(
        `order:${orderId}`,
        86400,
        JSON.stringify(orderPayload),
      );

      // 6. Overwrite the idempotency key with the real result so retries get
      //    the correct orderId instead of the PROCESSING placeholder
      if (idempotencyKey) {
        await this.redis.set(
          `idempotency:${idempotencyKey}`,
          JSON.stringify(orderResult),
          'EX',
          3600,
        );
      }

      return orderResult;
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

  async getOrder(orderId: string) {
    const raw = await this.redis.get(`order:${orderId}`);
    if (!raw) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return JSON.parse(raw);
  }

  async getOrderTimeline(orderId: string) {
    const raw = await this.redis.get(`order:${orderId}`);
    if (!raw) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const order = JSON.parse(raw) as {
      orderId: string;
      status: string;
      traceId?: string;
      timeline?: Array<{
        status: string;
        at: string;
        source: string;
        traceId?: string;
      }>;
    };

    return {
      orderId: order.orderId,
      currentStatus: order.status,
      timeline: order.timeline ?? [],
    };
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    source: string,
    traceId?: string,
  ) {
    const raw = await this.redis.get(`order:${orderId}`);
    if (!raw) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const now = new Date().toISOString();
    const order = JSON.parse(raw) as {
      orderId: string;
      status: string;
      traceId?: string;
      timeline?: Array<{
        status: string;
        at: string;
        source: string;
        traceId?: string;
      }>;
    };

    const timeline = Array.isArray(order.timeline) ? order.timeline : [];
    const last = timeline[timeline.length - 1];
    if (last?.status !== status) {
      timeline.push({
        status,
        at: now,
        source,
        traceId: traceId ?? order.traceId,
      });
    }

    const nextOrder = {
      ...order,
      status,
      updatedAt: now,
      timeline,
    };

    await this.redis.setex(
      `order:${orderId}`,
      86400,
      JSON.stringify(nextOrder),
    );

    return {
      orderId,
      status,
      updatedAt: now,
    };
  }
}
