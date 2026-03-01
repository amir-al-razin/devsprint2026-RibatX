import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QueueController } from './queue/queue.controller';

import { BullModule } from '@nestjs/bullmq';
import { TerminusModule } from '@nestjs/terminus';
import { OrdersProcessor } from './orders.processor';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: (() => {
        const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
        return {
          host: url.hostname,
          port: parseInt(url.port || '6379', 10),
          ...(url.password
            ? { password: decodeURIComponent(url.password) }
            : {}),
        };
      })(),
    }),
    BullModule.registerQueue({
      name: 'kitchen-orders',
    }),
    TerminusModule,
    HealthModule,
  ],
  controllers: [AppController, QueueController],
  providers: [AppService, OrdersProcessor],
})
export class AppModule {}
