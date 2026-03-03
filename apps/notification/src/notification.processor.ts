import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

type NotifyOrderJob = {
  orderId: string;
  studentId: string;
  status: string;
  traceId?: string;
};

@Processor('order-notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly gateway: NotificationGateway) {
    super();
  }

  async process(job: Job<NotifyOrderJob, any, string>): Promise<any> {
    const { orderId, studentId, status, traceId } = job.data;

    // 1) Real-time delivery (websocket)
    this.gateway.sendUpdate(studentId, orderId, status, traceId);

    // 2) Durable status update (only on successful job completion)
    const gatewayUrl = process.env.GATEWAY_SERVICE_URL || 'http://gateway:3000';
    const internalApiKey = process.env.INTERNAL_API_KEY;

    const res = await fetch(`${gatewayUrl}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(internalApiKey ? { 'X-Internal-Api-Key': internalApiKey } : {}),
      },
      body: JSON.stringify({
        status,
        source: 'notification-queue',
        traceId,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(
        `Failed to update order ${orderId} to ${status} (HTTP ${res.status})`,
      );
      throw new Error(
        `Gateway status update failed: ${res.status} ${res.statusText} ${body}`,
      );
    }

    this.logger.log(`Notified ${status} for order ${orderId} (job ${job.id})`);
    return { delivered: true, orderId, status };
  }
}
