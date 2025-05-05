import * as request from 'supertest';

import { setupE2EApp, resetDatabase, closeApp, app } from '../setup/test.setup';
import { createTestProvider, setProviderSchedule } from '../utils/factories';
import { PrismaService } from 'src/common/prisma.service';
import { DateTime } from 'luxon';
describe('Provider Controller (e2e)', () => {
  let providerId: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup = await setupE2EApp();
    prisma = setup.prisma;
  });

  beforeEach(async () => {
    await resetDatabase();
    const provider = await createTestProvider(prisma);
    providerId = provider.id;
    await setProviderSchedule(prisma, providerId);
  });

  afterAll(async () => {
    await closeApp();
  });

  it('should create a provider successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/providers')
      .send({
        name: 'Dr. Test',
        timezone: 'Europe/Berlin',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Dr. Test');
    expect(response.body.timezone).toBe('Europe/Berlin');
  });
  it('should update provider schedule successfully', async () => {
    const newProvider = await prisma.provider.create({
      data: {
        name: 'Test Provider',
        timezone: 'Europe/Berlin',
      },
    });

    const newProviderId = newProvider.id;
    const schedulePayload = {
      weeklySchedule: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
      },
      appointmentDuration: 30,
      timezone: 'Europe/Berlin',
    };

    const response = await request(app.getHttpServer())
      .post(`/api/providers/${newProviderId}/schedule`)
      .send(schedulePayload);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Schedule updated successfully');
  });
  it('should get provider availability successfully', async () => {
    const targetDate = DateTime.now()
      .set({ weekday: 1 })
      .plus({ weeks: 1 })
      .toFormat('yyyy-MM-dd');
    const response = await request(app.getHttpServer())
      .get(`/api/providers/${providerId}/availability`)
      .query({ date: targetDate });
    console.log(response.body);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('availableSlots');
    expect(Array.isArray(response.body.availableSlots)).toBe(true);
    expect(response.body.availableSlots.length).toBeGreaterThan(0);
    expect(response.body.availableSlots).toContain('09:00');
  });
});
