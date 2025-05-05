import { PrismaService } from 'src/common/prisma.service';

export async function createTestProvider(prisma: PrismaService) {
  return prisma.provider.create({
    data: {
      name: 'Dr. Test',
      timezone: 'Europe/Berlin',
    },
  });
}

export async function setProviderSchedule(
  prisma: PrismaService,
  providerId: string,
) {
  const weeklySchedule = {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
  };

  const scheduleData = Object.keys(weeklySchedule).map((dayOfWeek) => ({
    providerId,
    dayOfWeek: dayOfWeek,
    startTime: weeklySchedule[dayOfWeek].start,
    endTime: weeklySchedule[dayOfWeek].end,
    appointmentDuration: 30,
  }));

  return prisma.schedule.createMany({
    data: scheduleData,
  });
}
