import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdempotencyGuard } from '../common/guards/idempotency.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, IdempotencyGuard)
  @Post()
  createOrder(@Req() req: any, @Body('itemId') itemId: string) {
    const idempotencyKey = req.headers['x-idempotency-key'] as
      | string
      | undefined;
    return this.ordersService.createOrder(
      req.user.studentId,
      itemId,
      idempotencyKey,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/timeline')
  getOrderTimeline(@Param('id') id: string) {
    return this.ordersService.getOrderTimeline(id);
  }

  @Patch(':id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('source') source: string,
    @Body('traceId') traceId?: string,
    @Headers('x-internal-api-key') internalApiKey?: string,
  ) {
    this.ordersService.verifyInternalApiKey(internalApiKey);
    return this.ordersService.updateOrderStatus(id, status, source, traceId);
  }
}
