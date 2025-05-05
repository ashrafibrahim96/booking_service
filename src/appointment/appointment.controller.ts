import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('api/appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentService.create(dto);
  }

  @Get(':appointmentId')
  getAppointmentById(@Param('appointmentId') appointmentId: string) {
    return this.appointmentService.getAppointmentById(appointmentId);
  }
  @Delete(':appointmentId')
  cancelAppointment(@Param('appointmentId') appointmentId: string) {
    return this.appointmentService.cancelAppointment(appointmentId);
  }

  @Put(':appointmentId')
  reschedule(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.reschedule(appointmentId, dto);
  }
}
