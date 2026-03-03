import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Processor('kitchen-orders')
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    @InjectQueue('order-notifications')
    private readonly notificationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { orderId, studentId, traceId } = job.data;
    this.logger.log(`Processing order ${orderId} for student ${studentId}...`);

    // Step 1: enqueue IN_KITCHEN notification (durable + retryable)
    await this.notificationQueue.add(
      'notify-order',
      {
        orderId,
        studentId,
        status: 'IN_KITCHEN',
        traceId,
      },
      {
        jobId: `${orderId}:IN_KITCHEN`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 500 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`Enqueued IN_KITCHEN notification for order ${orderId}`);

    // Step 2: simulate cooking time (3–7 seconds)
    const cookingTime = Math.floor(Math.random() * 4000) + 3000;
    await new Promise((resolve) => setTimeout(resolve, cookingTime));

    this.logger.log(`Order ${orderId} is READY!`);

    // Step 3: enqueue READY notification (durable + retryable)
    await this.notificationQueue.add(
      'notify-order',
      {
        orderId,
        studentId,
        status: 'READY',
        traceId,
      },
      {
        jobId: `${orderId}:READY`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 500 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`Enqueued READY notification for order ${orderId}`);

    return { status: 'COMPLETED', orderId };
  }
}
