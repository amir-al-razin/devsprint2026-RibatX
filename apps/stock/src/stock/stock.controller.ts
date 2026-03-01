import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('reserve')
  reserve(@Body('itemId') itemId: string) {
    return this.stockService.reserve(itemId);
  }

  // Internal endpoint — called only by the gateway admin route
  @Patch('restock')
  restock(@Body('quantity') quantity: number) {
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      throw new BadRequestException('quantity must be a non-negative integer');
    }
    return this.stockService.restock(quantity);
  }

  @Get('items')
  getItems() {
    return this.stockService.getItems();
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.stockService.getItem(id);
  }
}
