import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.test' });

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

export let app: INestApplication;
export let prisma: PrismaService;

export async function setupE2EApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();

  prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase() {
  await prisma.appointment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.provider.deleteMany();
}

export async function closeApp() {
  await app.close();
}
