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

    const notificationUrl =
      process.env.NOTIFICATION_SERVICE_URL || 'http://notification:3004';

    // Step 1: notify IN_KITCHEN immediately
    try {
      await axios.patch(`${notificationUrl}/notify/${orderId}`, {
        status: 'IN_KITCHEN',
        studentId,
      });
      this.logger.log(`Order ${orderId} marked IN_KITCHEN`);
    } catch (error) {
      this.logger.error(
        `Failed to send IN_KITCHEN notification for order ${orderId}`,
      );
    }

    // Step 2: simulate cooking time (3–7 seconds)
    const cookingTime = Math.floor(Math.random() * 4000) + 3000;
    await new Promise((resolve) => setTimeout(resolve, cookingTime));

    this.logger.log(`Order ${orderId} is READY!`);

    // Step 3: notify READY
    try {
      await axios.patch(`${notificationUrl}/notify/${orderId}`, {
        status: 'READY',
        studentId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send READY notification for order ${orderId}`,
      );
    }

    return { status: 'COMPLETED', orderId };
  }
}
