import { AppointmentStatus } from '@prisma/client';
import { IsString, IsDateString, IsEnum } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  providerId: string;

  @IsString()
  patientId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}
