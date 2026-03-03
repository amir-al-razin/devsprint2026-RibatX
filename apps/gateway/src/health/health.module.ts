import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../prisma/prisma.module';
import {
  HealthController,
  RedisHealthIndicator,
  PostgresHealthIndicator,
} from './health.controller';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, PostgresHealthIndicator],
})
export class HealthModule {}
