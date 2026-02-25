import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`[identity] running on port ${port}`);
}
bootstrap();
