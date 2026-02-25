import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import axios from 'axios';

@Processor('kitchen-orders')
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    const { orderId, studentId, itemId } = job.data;
    this.logger.log(`Processing order ${orderId} for student ${studentId}...`);

    // Mock cooking time (3-7 seconds as per requirements)
    const cookingTime = Math.floor(Math.random() * 4000) + 3000;
    await new Promise((resolve) => setTimeout(resolve, cookingTime));

    this.logger.log(`Order ${orderId} is READY!`);

    // Notify the Notification Service (Mocking the internal call)
    try {
      const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
      await axios.post(`${notificationUrl}/notifications/status`, {
        orderId,
        status: 'READY',
      });
    } catch (error) {
      this.logger.error(`Failed to notify notification service for order ${orderId}`);
    }

    return { status: 'COMPLETED', orderId };
  }
}
