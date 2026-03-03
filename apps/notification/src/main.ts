import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  logger.log(`[notification] running on port ${port}`);
}
bootstrap();
