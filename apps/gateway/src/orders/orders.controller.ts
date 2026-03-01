import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
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
    return this.ordersService.createOrder(req.user.studentId, itemId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }
}
