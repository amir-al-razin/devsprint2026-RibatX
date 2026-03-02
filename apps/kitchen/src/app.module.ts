import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QueueController } from './queue/queue.controller';

import { BullModule } from '@nestjs/bullmq';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '@nestjs-modules/ioredis';
import { APP_GUARD } from '@nestjs/core';
import { OrdersProcessor } from './orders.processor';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { ChaosGuard } from './common/guards/chaos.guard';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
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
    MetricsModule,
  ],
  controllers: [AppController, QueueController],
  providers: [
    AppService,
    OrdersProcessor,
    {
      provide: APP_GUARD,
      useClass: ChaosGuard,
    },
  ],
})
export class AppModule {}
