import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaClient } from './generated/prisma';

async function seedItems(prisma: PrismaClient) {
  // Ensure there is exactly one "Iftar Box" item.
  const existing = await prisma.item.findFirst({
    where: { name: 'Iftar Box' },
  });
  if (!existing) {
    await prisma.item.deleteMany();
    await prisma.item.create({ data: { name: 'Iftar Box', quantity: 100 } });
    console.log('[stock] Initialised single Iftar Box item (qty: 100)');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  app.useGlobalPipes(new ValidationPipe());
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`[stock] running on port ${port}`);

  // Seed default items if DB is empty
  const prisma = new PrismaClient();
  try {
    await seedItems(prisma);
  } catch (e) {
    console.warn('[stock] Seed skipped:', e instanceof Error ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
}
bootstrap();
