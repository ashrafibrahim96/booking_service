import * as request from 'supertest';

import { setupE2EApp, resetDatabase, closeApp, app } from '../setup/test.setup';
import { createTestProvider, setProviderSchedule } from '../utils/factories';
import { DateTime } from 'luxon';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma.service';
describe('Appoinment Controller (e2e)', () => {
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

  it('should create an appointment successfully', async () => {
    const targetDate = DateTime.now()
      .set({ weekday: 1 })
      .plus({ weeks: 1 })
      .toFormat('yyyy-MM-dd');
    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        providerId,
        patientId: 'patient_123',
        startTime: `${targetDate}T09:00:00`,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('should fail if appointment is outside provider schedule', async () => {
    const targetDate = DateTime.now()
      .set({ weekday: 7 }) // set target date to Sunday
      .plus({ weeks: 1 })
      .toFormat('yyyy-MM-dd');

    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        providerId,
        patientId: 'patient_456',
        startTime: `${targetDate}T09:00:00`,
      });

    expect(response.status).toBe(400);
  });

  it('should not allow double booking for same slot', async () => {
    const targetDate = DateTime.now()
      .set({ weekday: 1 })
      .plus({ weeks: 1 })
      .toFormat('yyyy-MM-dd');

    const payload = {
      providerId,
      patientId: 'patient_789',
      startTime: `${targetDate}T10:00:00`,
    };

    // First booking
    const first = await request(app.getHttpServer())
      .post('/api/appointments')
      .send(payload);
    expect(first.status).toBe(201);

    // Second booking for same slot
    const second = await request(app.getHttpServer())
      .post('/api/appointments')
      .send(payload);
    expect(second.status).toBe(400);
  });
  it('should return validation error for missing fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        providerId,
        patientId: 'patient_789',
        // missing startTime
      });

    expect(response.status).toBe(400);
  });

  it('should cancel an appointment', async () => {
    const date = DateTime.now()
      .set({ weekday: 1 })
      .plus({ weeks: 1 })
      .toFormat('yyyy-MM-dd');
    const time = `${date}T11:00:00`;

    const created = await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        providerId,
        patientId: 'patient_002',
        startTime: time,
      });

    const response = await request(app.getHttpServer()).delete(
      `/api/appointments/${created.body.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(AppointmentStatus.CANCELLED);
  });

  it('should fetch a single appointment', async () => {
    const date = DateTime.now()
      .set({ weekday: 1 })
      .plus({ weeks: 1 })
      .toFormat('yyyy-MM-dd');
    const time = `${date}T12:00:00`;

    const created = await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        providerId,
        patientId: 'patient_003',
        startTime: time,
      });

    const response = await request(app.getHttpServer()).get(
      `/api/appointments/${created.body.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.body.id);
  });
});
