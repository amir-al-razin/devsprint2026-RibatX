import { QueueController } from './queue.controller';

describe('QueueController', () => {
  it('returns recent queue items sorted by newest timestamp', async () => {
    const queue = {
      getJobs: jest.fn(async (state: string) => {
        if (state === 'active') {
          return [
            {
              id: '1',
              data: { orderId: 'ORD-1', studentId: 'stu-1', itemId: 'item-1' },
              processedOn: Date.now(),
              timestamp: 1700000002000,
            },
          ];
        }

        return [
          {
            id: '2',
            data: { orderId: 'ORD-2', studentId: 'stu-2', itemId: 'item-2' },
            processedOn: undefined,
            timestamp: 1700000003000,
          },
        ];
      }),
    } as any;

    const controller = new QueueController(queue);

    const result = await controller.getRecent('10');

    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({
      orderId: 'ORD-2',
      state: 'waiting',
    });
    expect(result.items[1]).toMatchObject({
      orderId: 'ORD-1',
      state: 'active',
    });
  });

  it('caps limit between 1 and 20', async () => {
    const queue = {
      getJobs: jest.fn().mockResolvedValue([]),
    } as any;

    const controller = new QueueController(queue);

    await controller.getRecent('500');

    expect(queue.getJobs).toHaveBeenNthCalledWith(1, 'active', 0, 19, true);
    expect(queue.getJobs).toHaveBeenNthCalledWith(2, 'waiting', 0, 19, true);
  });
});
