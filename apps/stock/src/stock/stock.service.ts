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
    let retries = 3;
    while (retries > 0) {
      const item = await this.prisma.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new NotFoundException('Item not found');
      }

      if (item.quantity <= 0) {
        throw new ConflictException('Out of stock');
      }

      try {
        const updated = await this.prisma.item.updateMany({
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
          retries--;
          if (retries === 0) {
            throw new ConflictException('Concurrency conflict, try again');
          }
          continue;
        }

        // Cache write-back
        await this.redis.set(`stock:${itemId}`, item.quantity - 1);

        return {
          reserved: true,
          remaining: item.quantity - 1,
          itemId,
        };
      } catch (error) {
        // Re-throw intentional HTTP exceptions — don't count them as retryable
        if (
          error instanceof ConflictException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
        retries--;
        if (retries === 0) throw error;
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

    let retries = 3;
    while (retries > 0) {
      try {
        const updated = await this.prisma.item.updateMany({
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
          // Version conflict — re-read to get the latest version and retry
          retries--;
          if (retries === 0) {
            throw new ConflictException('Concurrency conflict, try again');
          }
          const fresh = await this.prisma.item.findFirst({
            where: { name: 'Iftar Box' },
          });
          if (!fresh) throw new NotFoundException('No item found');
          item = fresh;
          continue;
        }

        // Invalidate Redis cache so gateway picks up new quantity immediately
        await this.redis.set(`stock:${item.id}`, quantity);
        return { id: item.id, name: item.name, quantity };
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
        retries--;
        if (retries === 0) throw error;
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
