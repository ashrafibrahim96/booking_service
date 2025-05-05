import { Module } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { ProviderController } from './provider.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [ProviderController],
  providers: [ProviderService, PrismaService],
})
export class ProviderModule {}
