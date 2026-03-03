import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';

import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { ChaosGuard } from './common/guards/chaos.guard';
import { NotificationProcessor } from './notification.processor';

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
    BullModule.registerQueue({ name: 'order-notifications' }),
    HealthModule,
    MetricsModule,
  ],
  controllers: [NotificationController],
  providers: [
    AppService,
    NotificationGateway,
    NotificationProcessor,
    {
      provide: APP_GUARD,
      useClass: ChaosGuard,
    },
  ],
})
export class AppModule {}
