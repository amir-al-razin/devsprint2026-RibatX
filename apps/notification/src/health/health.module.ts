import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController, UptimeHealthIndicator } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [UptimeHealthIndicator],
})
export class HealthModule {}
