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

    return { success: true };
  }
}
