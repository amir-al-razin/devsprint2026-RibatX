import { IdempotencyGuard } from './idempotency.guard';

describe('IdempotencyGuard', () => {
  const makeContext = (idempotencyKey?: string) => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const request = {
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any;

    return { context, response };
  };

  it('allows request when no idempotency key is present', async () => {
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
    } as any;
    const guard = new IdempotencyGuard(redis);
    const { context, response } = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.set).not.toHaveBeenCalled();
    expect(redis.get).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('allows first request when atomic lock is acquired', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
    } as any;
    const guard = new IdempotencyGuard(redis);
    const { context, response } = makeContext('idem-1');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      'idempotency:idem-1',
      JSON.stringify({ status: 'PROCESSING' }),
      'EX',
      3600,
      'NX',
    );
    expect(redis.get).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('returns cached result for duplicate request when lock not acquired', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue(null),
      get: jest
        .fn()
        .mockResolvedValue('{"status":"PENDING","orderId":"ORD-1"}'),
    } as any;
    const guard = new IdempotencyGuard(redis);
    const { context, response } = makeContext('idem-2');

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(redis.get).toHaveBeenCalledWith('idempotency:idem-2');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: 'PENDING',
      orderId: 'ORD-1',
    });
  });

  it('returns PROCESSING when duplicate cache payload is malformed', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue(null),
      get: jest.fn().mockResolvedValue('not-json'),
    } as any;
    const guard = new IdempotencyGuard(redis);
    const { context, response } = makeContext('idem-3');

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ status: 'PROCESSING' });
  });
});
