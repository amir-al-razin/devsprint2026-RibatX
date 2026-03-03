import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private redis: Redis,
  ) {}

  async reserve(itemId: string) {
    const maxRetries = 3;
    const baseDelayMs = 10;
    const maxDelayMs = 200;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const item = await tx.item.findUnique({
            where: { id: itemId },
          });

          if (!item) {
            throw new NotFoundException('Item not found');
          }

          if (item.quantity <= 0) {
            throw new ConflictException('Out of stock');
          }

          const updated = await tx.item.updateMany({
            where: {
              id: itemId,
              version: item.version,
              quantity: { gt: 0 },
            },
            data: {
              quantity: item.quantity - 1,
              version: item.version + 1,
            },
          });

          if (updated.count === 0) {
            // Version conflict — let outer retry logic handle it
            return null;
          }

          return {
            reserved: true,
            remaining: item.quantity - 1,
            itemId,
          };
        });

        if (!result) {
          if (attempt === maxRetries) {
            throw new ConflictException('Concurrency conflict, try again');
          }

          const delay =
            Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) / 2;
          const jitter = Math.random() * delay;
          await new Promise((resolve) => setTimeout(resolve, jitter));
          continue;
        }

        // Cache write-back after successful transaction
        await this.redis.set(`stock:${itemId}`, result.remaining);
        return result;
      } catch (error) {
        // Re-throw intentional HTTP exceptions — don't count them as retryable
        if (
          error instanceof ConflictException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }

        if (attempt === maxRetries) {
          throw error;
        }

        const delay =
          Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) / 2;
        const jitter = Math.random() * delay;
        await new Promise((resolve) => setTimeout(resolve, jitter));
      }
    }
  }

  async restock(quantity: number) {
    // Look up the item once; fail fast if it does not exist (no point retrying)
    let item = await this.prisma.item.findFirst({
      where: { name: 'Iftar Box' },
    });
    if (!item) {
      throw new NotFoundException('No item found');
    }

    const maxRetries = 3;
    const baseDelayMs = 10;
    const maxDelayMs = 200;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.item.updateMany({
            where: {
              id: item.id,
              version: item.version,
            },
            data: {
              quantity,
              version: item.version + 1,
            },
          });

          if (updated.count === 0) {
            return null;
          }

          return { id: item.id, name: item.name, quantity };
        });

        if (!result) {
          if (attempt === maxRetries) {
            throw new ConflictException('Concurrency conflict, try again');
          }

          const fresh = await this.prisma.item.findFirst({
            where: { name: 'Iftar Box' },
          });
          if (!fresh) {
            throw new NotFoundException('No item found');
          }
          item = fresh;

          const delay =
            Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) / 2;
          const jitter = Math.random() * delay;
          await new Promise((resolve) => setTimeout(resolve, jitter));
          continue;
        }

        // Invalidate Redis cache so gateway picks up new quantity immediately
        await this.redis.set(`stock:${item.id}`, quantity);
        return result;
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }

        if (attempt === maxRetries) {
          throw error;
        }

        const delay =
          Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) / 2;
        const jitter = Math.random() * delay;
        await new Promise((resolve) => setTimeout(resolve, jitter));
      }
    }
  }

  async getItems() {
    return this.prisma.item.findMany();
  }

  async getItem(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }
}
