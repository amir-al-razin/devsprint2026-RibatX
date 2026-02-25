import { Controller, Post, Body } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly gateway: NotificationGateway) {}

  @Post('status')
  updateStatus(@Body() body: { orderId: string; status: string }) {
    this.gateway.sendUpdate(body.orderId, body.status);
    return { success: true };
  }
}
