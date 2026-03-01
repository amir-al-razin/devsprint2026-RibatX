import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { HealthModule } from './health/health.module';

import { RedisModule } from '@nestjs-modules/ioredis';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
    MetricsModule,
    HealthModule,
  ],
  controllers: [NotificationController, AppController],
  providers: [
    AppService,
    NotificationGateway,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
