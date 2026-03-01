import { Module } from '@nestjs/common';
import { AppService } from './app.service';

import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule],
  controllers: [NotificationController],
  providers: [AppService, NotificationGateway],
})
export class AppModule {}
