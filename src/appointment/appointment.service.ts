import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { emitEvent } from '../common/event-emitter.service';
import { CancellationReasons, EventTypes } from '../common/constants/events';

@Injectable()
export class AppointmentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    const { providerId, patientId, startTime } = dto;

    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }
    const start = DateTime.fromISO(startTime);

    if (start < DateTime.now()) {
      throw new BadRequestException('Cannot create an appointment in the past');
    }
    const dayOfWeek = start.toFormat('cccc').toLowerCase();

    const schedule = await this.prisma.schedule.findFirst({
      where: { providerId: providerId, dayOfWeek },
    });

    if (!schedule) {
      throw new BadRequestException(
        `No schedule found for provider on ${dayOfWeek}`,
      );
    }

    //calculate end time
    const end = start.plus({ minutes: schedule.appointmentDuration });

    // //check for overlapping appointments
    // const isOverlapping = await this.isOverlapping(
    //   dto.providerId,
    //   start.toJSDate(),
    //   end.toJSDate(),
    // );

    // if (isOverlapping) {
    //   throw new BadRequestException(
    //     'The appointment overlaps with an existing appointment.',
    //   );
    // }

    return await this.prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          providerId,
          status: AppointmentStatus.CONFIRMED,
          startTime: { lt: end.toJSDate() },
          endTime: { gt: start.toJSDate() },
        },
      });
      if (conflict) {
        throw new BadRequestException('Time slot is already booked !');
      }

      const appointment = await tx.appointment.create({
        data: {
          providerId,
          patientId,
          startTime: start.toJSDate(),
          endTime: end.toJSDate(),
          status: AppointmentStatus.CONFIRMED,
        },
      });
      emitEvent(EventTypes.APPOINTMENT_CONFIRMED, {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        providerId: appointment.providerId,
        appointmentTime: appointment.startTime.toISOString(),
      });

      return appointment;
    });
  }

  async getAppointmentById(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    return appointment;
  }
  async reschedule(appointmentId: string, dto: UpdateAppointmentDto) {
    const existingAppointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existingAppointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    const start = DateTime.fromISO(dto.startTime);
    const dayOfWeek = start.toFormat('cccc').toLowerCase();

    const schedule = await this.prisma.schedule.findFirst({
      where: { providerId: existingAppointment.providerId, dayOfWeek },
    });

    if (!schedule) {
      throw new BadRequestException(
        `No schedule found for provider on ${dayOfWeek} ${dto.startTime}`,
      );
    }

    const newStartTime = new Date(dto.startTime);
    const newEndTime = start.plus({ minutes: schedule.appointmentDuration });

    const scheduleStart = DateTime.fromFormat(schedule.startTime, 'HH:mm');
    const scheduleEnd = DateTime.fromFormat(schedule.endTime, 'HH:mm');

    // Get the same date as the appointment (strip time)
    const appointmentDate = start.startOf('day');

    // Combine date with schedule hours
    const scheduleStartDateTime = appointmentDate.plus({
      hours: scheduleStart.hour,
      minutes: scheduleStart.minute,
    });
    const scheduleEndDateTime = appointmentDate.plus({
      hours: scheduleEnd.hour,
      minutes: scheduleEnd.minute,
    });

    // Validate that appointment is inside the schedule range
    if (
      newStartTime < scheduleStartDateTime.toJSDate() ||
      newEndTime > scheduleEndDateTime.toJSDate()
    ) {
      throw new BadRequestException(
        `Rescheduled time (${start.toISO()} - ${newEndTime.toISO()}) is outside of provider working hours (${schedule.startTime} - ${schedule.endTime})`,
      );
    }

    const isOverlapping = await this.isOverlapping(
      existingAppointment.providerId,
      newStartTime,
      newEndTime,
      appointmentId, // Exclude current appointment from overlap check
    );

    if (isOverlapping) {
      throw new BadRequestException(
        'New time overlaps with an existing appointment.',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
        status: AppointmentStatus.RESCHEDULED,
      },
    });

    emitEvent(EventTypes.APPOINTMENT_RESCHEDULED, {
      appointmentId,
      patientId: existingAppointment.patientId,
      providerId: existingAppointment.providerId,
      previousAppointmentTime: existingAppointment.startTime.toISOString(),
      newAppointmentTime: updated.startTime.toISOString(),
    });
    return updated;
  }

  async cancelAppointment(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }
    const cancelled = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
    });

    emitEvent(EventTypes.APPOINTMENT_CANCELLED, {
      appointmentId,
      reason: CancellationReasons.PATIENT_REQUEST,
    });
    return cancelled;
  }

  private async isOverlapping(
    providerId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        providerId,
        status: AppointmentStatus.CONFIRMED,
        OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
      },
    });
    return existingAppointments.length > 0;
  }
}
