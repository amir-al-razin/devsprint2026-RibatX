import {
  Injectable,
  ConflictException,
  ServiceUnavailableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

export interface OrderTimelineEntry {
  status: string;
  at: string;
  source: string;
  traceId?: string;
}

export interface OrderPayload {
  orderId: string;
  traceId: string;
  status: string;
  studentId: string;
  itemId: string;
  createdAt: string;
  updatedAt?: string;
  timeline: OrderTimelineEntry[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRedis() private redis: Redis,
    @InjectQueue('kitchen-orders') private kitchenQueue: Queue,
    private readonly prisma: PrismaService,
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

      const orderId = `ORD-${uuidv4()}`;
      const traceId = `TRC-${uuidv4()}`;

      // 4. HAND OFF TO KITCHEN QUEUE (Day 2/3 Feature)
      await this.kitchenQueue.add('cook-order', {
        orderId,
        traceId,
        studentId,
        itemId,
      });

      const verifiedAt = new Date().toISOString();

      const orderPayload: OrderPayload = {
        orderId,
        traceId,
        status: 'STOCK_VERIFIED',
        studentId,
        itemId,
        createdAt: pendingAt,
        updatedAt: verifiedAt,
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

      // 5. Persist order durably in Postgres (source of truth)
      await this.prisma.order.create({
        data: {
          id: orderId,
          traceId,
          status: orderPayload.status,
          studentId: orderPayload.studentId,
          itemId: orderPayload.itemId,
          createdAt: new Date(orderPayload.createdAt),
          updatedAt: orderPayload.updatedAt
            ? new Date(orderPayload.updatedAt)
            : undefined,
          timeline: orderPayload.timeline as any,
        },
      });

      // 6. Write-through to Redis so GET /orders/:id can read quickly
      await this.redis.setex(
        `order:${orderId}`,
        86400,
        JSON.stringify(orderPayload),
      );

      const orderResult = {
        orderId,
        status: orderPayload.status,
        message: 'Order received and sent to kitchen',
      };

      // 7. Overwrite the idempotency key with the real result so retries get
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
    // First try Redis (read-through cache)
    const cached = await this.redis.get(`order:${orderId}`);
    if (cached) {
      return JSON.parse(cached) as OrderPayload;
    }

    // Fall back to Postgres as the source of truth
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const payload: OrderPayload = {
      orderId: order.id,
      traceId: order.traceId,
      status: order.status,
      studentId: order.studentId,
      itemId: order.itemId,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt?.toISOString(),
      timeline: (order.timeline as unknown as OrderTimelineEntry[]) ?? [],
    };

    // Populate Redis cache for subsequent reads
    await this.redis.setex(`order:${orderId}`, 86400, JSON.stringify(payload));

    return payload;
  }

  async getOrderTimeline(orderId: string) {
    const order = await this.getOrder(orderId);

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
    const now = new Date().toISOString();

    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const timeline = Array.isArray(existing.timeline)
      ? (existing.timeline as unknown as OrderTimelineEntry[])
      : [];

    const last = timeline[timeline.length - 1];
    if (last?.status !== status) {
      timeline.push({
        status,
        at: now,
        source,
        traceId: traceId ?? existing.traceId,
      });
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date(now),
        timeline: timeline as any,
      },
    });

    const payload: OrderPayload = {
      orderId: updated.id,
      traceId: updated.traceId,
      status: updated.status,
      studentId: updated.studentId,
      itemId: updated.itemId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt?.toISOString(),
      timeline: (updated.timeline as unknown as OrderTimelineEntry[]) ?? [],
    };

    await this.redis.setex(`order:${orderId}`, 86400, JSON.stringify(payload));

    return {
      orderId,
      status,
      updatedAt: now,
    };
  }
}
