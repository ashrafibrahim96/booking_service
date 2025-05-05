import { IsArray, IsInt, IsObject, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ScheduleItemDto {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  appointmentDuration: number;
}


export class UpdateScheduleDto {
  @IsObject()
  weeklySchedule: {
    [key: string]: {
      start: string;
      end: string;
    };
  };

  @IsInt()
  @Min(1)
  appointmentDuration: number;

  @IsString()
  timezone: string;
}
