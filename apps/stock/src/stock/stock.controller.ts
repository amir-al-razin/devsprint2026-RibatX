import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('reserve')
  reserve(@Body('itemId') itemId: string) {
    return this.stockService.reserve(itemId);
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
