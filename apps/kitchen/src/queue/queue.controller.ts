import { Controller, Get, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('queue')
export class QueueController {
  constructor(@InjectQueue('kitchen-orders') private readonly queue: Queue) {}

  @Get('recent')
  async getRecent(@Query('limit') limit?: string): Promise<{
    total: number;
    items: Array<{
      orderId: string;
      studentId?: string;
      itemId?: string;
      traceId?: string;
      state: 'waiting' | 'active';
      createdAt: string;
    }>;
  }> {
    const parsed = parseInt(limit ?? '10', 10);
    const capped = Number.isFinite(parsed)
      ? Math.max(1, Math.min(20, parsed))
      : 10;

    const activeJobs = await this.queue.getJobs('active', 0, capped - 1, true);
    const waitingJobs = await this.queue.getJobs(
      'waiting',
      0,
      capped - 1,
      true,
    );

    const items = [...activeJobs, ...waitingJobs]
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, capped)
      .map((job) => {
        const data = (job.data ?? {}) as {
          orderId?: string;
          studentId?: string;
          itemId?: string;
          traceId?: string;
        };

        return {
          orderId: data.orderId ?? String(job.id ?? 'unknown'),
          studentId: data.studentId,
          itemId: data.itemId,
          traceId: data.traceId,
          state: (job.processedOn ? 'active' : 'waiting') as
            | 'waiting'
            | 'active',
          createdAt: new Date(job.timestamp ?? Date.now()).toISOString(),
        };
      });

    return { total: items.length, items };
  }

  @Get('length')
  async getLength(): Promise<{
    waiting: number;
    active: number;
    total: number;
  }> {
    const counts = await this.queue.getJobCounts('waiting', 'active');
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      total: (counts.waiting ?? 0) + (counts.active ?? 0),
    };
  }
}
