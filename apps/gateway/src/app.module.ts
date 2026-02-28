import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { OrdersModule } from './orders/orders.module';
import { JwtStrategy } from './auth/jwt.strategy';
import { ChaosController } from './chaos.controller';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
    JwtModule.register({}),
    BullModule.forRoot({
      connection: (() => {
        const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
        return { host: url.hostname, port: parseInt(url.port || '6379', 10) };
      })(),
    }),
    OrdersModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [AppController, ChaosController],
  providers: [
    AppService,
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
