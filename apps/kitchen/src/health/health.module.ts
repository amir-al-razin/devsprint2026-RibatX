import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HealthController, BullHealthIndicator } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    BullModule.registerQueue({ name: 'kitchen-orders' }),
  ],
  controllers: [HealthController],
  providers: [BullHealthIndicator],
})
export class HealthModule {}
