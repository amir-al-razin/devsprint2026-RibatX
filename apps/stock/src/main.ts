import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaClient } from './generated/prisma';

async function seedItems(prisma: PrismaClient) {
  const count = await prisma.item.count();
  if (count === 0) {
    await prisma.item.createMany({
      data: [
        { name: 'Iftar Box', quantity: 100 },
        { name: 'Drinko', quantity: 50 },
        { name: 'Doctor Laban', quantity: 75 },
      ],
    });
    console.log('[stock] Seeded 3 default menu items');
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
