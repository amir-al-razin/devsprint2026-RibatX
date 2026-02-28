import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('queue')
export class QueueController {
  constructor(@InjectQueue('kitchen-orders') private readonly queue: Queue) {}

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
