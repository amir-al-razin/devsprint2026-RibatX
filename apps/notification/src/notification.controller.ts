import { Controller, Patch, Param, Body } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Controller()
export class NotificationController {
  constructor(private readonly gateway: NotificationGateway) {}

  // Called by Kitchen Queue: PATCH /notify/:orderId { status, studentId }
  @Patch('notify/:orderId')
  notifyOrder(
    @Param('orderId') orderId: string,
    @Body() body: { status: string; studentId: string; traceId?: string },
  ) {
    this.gateway.sendUpdate(body.studentId, orderId, body.status, body.traceId);

    const gatewayUrl = process.env.GATEWAY_SERVICE_URL || 'http://gateway:3000';
    const internalApiKey = process.env.INTERNAL_API_KEY;

    fetch(`${gatewayUrl}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(internalApiKey ? { 'X-Internal-Api-Key': internalApiKey } : {}),
      },
      body: JSON.stringify({
        status: body.status,
        source: 'notification',
        traceId: body.traceId,
      }),
    }).catch(() => {
      // non-blocking for socket delivery
    });

    return { success: true };
  }
}
