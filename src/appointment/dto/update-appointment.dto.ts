import { IsDateString } from 'class-validator';

export class UpdateAppointmentDto {
  @IsDateString()
  startTime: string;
}
