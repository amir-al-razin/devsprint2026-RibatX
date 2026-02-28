import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { OrdersService } from './orders.service';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { getQueueToken } from '@nestjs/bullmq';

describe('OrdersService', () => {
  let service: OrdersService;
  let httpService: { post: jest.Mock };
  let redis: { get: jest.Mock };
  let kitchenQueue: { add: jest.Mock };

  beforeEach(async () => {
    httpService = { post: jest.fn() };
    // Default: no chaos for any service, no cached stock
    redis = { get: jest.fn().mockResolvedValue(null) };
    kitchenQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: HttpService, useValue: httpService },
        { provide: getRedisConnectionToken(), useValue: redis },
        { provide: getQueueToken('kitchen-orders'), useValue: kitchenQueue },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('throws ConflictException immediately when Redis cache has stock at "0" (no HTTP call)', async () => {
      redis.get.mockResolvedValue('0');

      await expect(service.createOrder('student-1', 'item-1')).rejects.toThrow(
        ConflictException,
      );
      expect(httpService.post).not.toHaveBeenCalled();
      expect(kitchenQueue.add).not.toHaveBeenCalled();
    });

    it('returns PENDING order and enqueues kitchen job when stock is available', async () => {
      redis.get.mockResolvedValue('5');
      httpService.post.mockReturnValue(
        of({ data: { reserved: true, remaining: 4 } } as AxiosResponse),
      );

      const result = await service.createOrder('student-1', 'item-1');

      expect(result.status).toBe('PENDING');
      expect(result.orderId).toMatch(/^ORD-/);
      expect(kitchenQueue.add).toHaveBeenCalledWith(
        'cook-order',
        expect.objectContaining({ studentId: 'student-1', itemId: 'item-1' }),
      );
    });

    it('proceeds to Stock Service when Redis cache key is absent (cache miss)', async () => {
      redis.get.mockResolvedValue(null);
      httpService.post.mockReturnValue(
        of({ data: { reserved: true, remaining: 99 } } as AxiosResponse),
      );

      const result = await service.createOrder('student-2', 'item-1');

      expect(result.status).toBe('PENDING');
      expect(httpService.post).toHaveBeenCalled();
    });

    it('throws ConflictException when Stock Service responds with 409', async () => {
      redis.get.mockResolvedValue(null);
      const stockError = { response: { status: 409 } };
      httpService.post.mockReturnValue(throwError(() => stockError));

      await expect(service.createOrder('student-1', 'item-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ServiceUnavailableException when Stock Service is unreachable', async () => {
      redis.get.mockResolvedValue(null);
      const networkError = { message: 'ECONNREFUSED' };
      httpService.post.mockReturnValue(throwError(() => networkError));

      await expect(service.createOrder('student-1', 'item-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws ServiceUnavailableException when chaos mode is active', async () => {
      // Activate chaos on the stock service
      redis.get.mockImplementation((key: string) =>
        Promise.resolve(key === 'chaos:gateway' ? '1' : null),
      );

      await expect(service.createOrder('student-1', 'item-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(httpService.post).not.toHaveBeenCalled();
      expect(kitchenQueue.add).not.toHaveBeenCalled();
    });
  });
});
