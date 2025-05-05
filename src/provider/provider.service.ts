import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { DateTime } from 'luxon';
import { CreateProviderDto } from './dto/create-provider.dto';

@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async createProvider(createProviderDto: CreateProviderDto) {
    const { name, timezone } = createProviderDto;
    const provider = await this.prisma.provider.create({
      data: {
        name,
        timezone,
      },
    });

    return provider;
  }

  async updateSchedule(providerId: string, dto: UpdateScheduleDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }
    // Delete existing schedules and re-insert
    await this.prisma.schedule.deleteMany({ where: { providerId } });
    const { weeklySchedule, appointmentDuration } = dto;

    // Convert weeklySchedule object into an array of schedule entries
    const data = Object.entries(weeklySchedule).map(([dayOfWeek, time]) => ({
      dayOfWeek,
      startTime: time.start,
      endTime: time.end,
      appointmentDuration,
      providerId,
    }));

    await this.prisma.schedule.createMany({ data });

    return { message: 'Schedule updated successfully' };
  }

  async getAvailability(providerId: string, date: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }
    const targetDate = DateTime.fromISO(date);

    const dayOfWeek = targetDate.toFormat('cccc').toLowerCase();
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        providerId,
        dayOfWeek,
      },
    });
    if (!schedule) {
      return { providerId, date, availableSlots: [] };
    }

    const { startTime, endTime, appointmentDuration } = schedule;

    const start = DateTime.fromFormat(
      `${date} ${startTime}`,
      'yyyy-MM-dd HH:mm',
    );
    const end = DateTime.fromFormat(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm');

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        providerId,
        startTime: {
          gte: start.toJSDate(),
          lt: end.toJSDate(),
        },
      },
    });

    const bookedSlots = existingAppointments.map((app) => ({
      start: DateTime.fromJSDate(app.startTime),
      end: DateTime.fromJSDate(app.endTime),
    }));

    const slots = [];

    let slotStart = start;
    while (slotStart.plus({ minutes: appointmentDuration }) <= end) {
      const slotEnd = slotStart.plus({ minutes: appointmentDuration });

      const overlaps = bookedSlots.some(
        (b) => slotStart < b.end && slotEnd > b.start,
      );

      if (!overlaps) {
        slots.push(slotStart.toFormat('HH:mm'));
      }

      slotStart = slotEnd;
    }

    return {
      providerId,
      date,
      availableSlots: slots,
    };
  }
}
