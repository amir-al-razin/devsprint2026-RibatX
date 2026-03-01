import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, HealthCheckError } from '@nestjs/terminus';
import {
  HealthController,
  PrismaHealthIndicator,
  RedisHealthIndicator,
} from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({ $queryRaw: jest.fn() })),
}));

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
  });

  it('returns healthy status when query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const result = await indicator.isHealthy('database');
    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('throws HealthCheckError when query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('DB connection lost'));
    await expect(indicator.isHealthy('database')).rejects.toThrow(
      HealthCheckError,
    );
  });
});

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let redis: { ping: jest.Mock };

  beforeEach(async () => {
    redis = { ping: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        { provide: 'default_IORedisModuleConnectionToken', useValue: redis },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  it('returns healthy status when ping returns PONG', async () => {
    redis.ping.mockResolvedValue('PONG');
    const result = await indicator.isHealthy('redis');
    expect(result).toEqual({ redis: { status: 'up' } });
  });

  it('throws HealthCheckError when ping returns unexpected response', async () => {
    redis.ping.mockResolvedValue('OK');
    await expect(indicator.isHealthy('redis')).rejects.toThrow(
      HealthCheckError,
    );
  });

  it('throws HealthCheckError when ping rejects', async () => {
    redis.ping.mockRejectedValue(new Error('connection refused'));
    await expect(indicator.isHealthy('redis')).rejects.toThrow(
      HealthCheckError,
    );
  });
});

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let prismaIndicator: { isHealthy: jest.Mock };
  let redisIndicator: { isHealthy: jest.Mock };

  beforeEach(async () => {
    healthCheckService = { check: jest.fn() };
    prismaIndicator = { isHealthy: jest.fn() };
    redisIndicator = { isHealthy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: PrismaHealthIndicator, useValue: prismaIndicator },
        { provide: RedisHealthIndicator, useValue: redisIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns health check result when all indicators are healthy', async () => {
    const mockResult = {
      status: 'ok',
      info: { database: { status: 'up' }, redis: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' }, redis: { status: 'up' } },
    };
    healthCheckService.check.mockResolvedValue(mockResult);

    const result = await controller.check();
    expect(result).toEqual({ ...mockResult, service: 'identity' });
    expect(healthCheckService.check).toHaveBeenCalledWith([
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  it('propagates errors from HealthCheckService', async () => {
    healthCheckService.check.mockRejectedValue(
      new HealthCheckError('check failed', {}),
    );
    await expect(controller.check()).rejects.toThrow(HealthCheckError);
  });
});
