import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'kitchen-orders',
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
