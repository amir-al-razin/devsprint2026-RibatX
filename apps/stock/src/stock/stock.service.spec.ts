import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';

describe('StockService', () => {
  let service: StockService;
  let prisma: { item: { findUnique: jest.Mock; updateMany: jest.Mock } };
  let redis: { set: jest.Mock };

  const mockItem = {
    id: 'item-1',
    name: 'Iftar Box',
    quantity: 10,
    version: 1,
  };

  beforeEach(async () => {
    prisma = {
      item: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    redis = { set: jest.fn().mockResolvedValue('OK') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: prisma },
        { provide: getRedisConnectionToken(), useValue: redis },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserve', () => {
    it('decrements quantity, increments version, and writes back to Redis on success', async () => {
      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.item.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.reserve('item-1');

      expect(result).toEqual({
        reserved: true,
        remaining: 9,
        itemId: 'item-1',
      });
      expect(prisma.item.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', version: 1, quantity: { gt: 0 } },
        data: { quantity: 9, version: 2 },
      });
      expect(redis.set).toHaveBeenCalledWith('stock:item-1', 9);
    });

    it('throws ConflictException immediately when quantity is 0 (no DB update)', async () => {
      prisma.item.findUnique.mockResolvedValue({ ...mockItem, quantity: 0 });

      await expect(service.reserve('item-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.item.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException after exhausting all 3 version-conflict retries', async () => {
      prisma.item.findUnique.mockResolvedValue(mockItem);
      // updateMany always returns 0 rows updated → simulates concurrent version conflict
      prisma.item.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.reserve('item-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.item.updateMany).toHaveBeenCalledTimes(3);
    });

    it('throws NotFoundException when the item does not exist', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      await expect(service.reserve('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.item.updateMany).not.toHaveBeenCalled();
    });
  });
});
