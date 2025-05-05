import { Module } from '@nestjs/common';
import { ProviderModule } from './provider/provider.module';
import { AppointmentModule } from './appointment/appointment.module';
import { PrismaService } from './common/prisma.service';

@Module({
  imports: [ProviderModule, AppointmentModule],
  providers: [PrismaService],
})
export class AppModule {}
