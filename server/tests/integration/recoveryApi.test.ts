import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { testTokens } from '../helpers/testTokens.js';

describe('API Integration — Disruption Recovery Endpoint (/api/v1/recovery/reassign)', () => {
  it('Scenario 12: rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/reassign')
      .send({
        event: {
          roomId: 'room-101',
          reason: 'Emergency electrical maintenance',
        },
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('UNAUTHORIZED');
  });

  it('Scenario 13: rejects unauthorized role (TUTOR) with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.TUTOR}`)
      .send({
        event: {
          roomId: 'room-101',
          reason: 'Emergency electrical maintenance',
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('FORBIDDEN');
  });

  it('Scenario 14: rejects malformed payload (missing reason / inverted time slot) with 400 VALIDATION_ERROR', async () => {
    const resShortReason = await request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.SYSTEM_ADMIN}`)
      .send({
        event: {
          roomId: 'room-101',
          reason: 'No', // Too short (< 3 chars)
        },
      });

    expect(resShortReason.status).toBe(400);
    expect(resShortReason.body.success).toBe(false);
    expect(resShortReason.body.error?.code).toBe('VALIDATION_ERROR');

    const resInvertedSlot = await request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.SYSTEM_ADMIN}`)
      .send({
        event: {
          roomId: 'room-101',
          reason: 'Valid reason for test',
          slot: {
            dayOfWeek: 'Monday',
            startTime: '11:00',
            endTime: '09:00', // Inverted time slot
          },
        },
      });

    expect(resInvertedSlot.status).toBe(400);
    expect(resInvertedSlot.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('Scenario 17: rejects client attempts to supply unauthorized requests/rooms/closures data with 400 VALIDATION_ERROR', async () => {
    const resRogueBody = await request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.SYSTEM_ADMIN}`)
      .send({
        event: {
          roomId: 'room-101',
          reason: 'Valid emergency closure reason',
        },
        requests: [
          {
            id: 'rogue-booking-id',
            title: 'Fabricated Hijack Request',
            enrollmentCount: 1,
            slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
          },
        ],
        rooms: [
          {
            id: 'rogue-room-id',
            code: 'ROGUE-99',
            capacity: 999,
          },
        ],
      });

    // Public API strictly rejects rogue client-supplied datasets
    expect(resRogueBody.status).toBe(400);
    expect(resRogueBody.body.success).toBe(false);
    expect(resRogueBody.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('Scenario 18: rejects unknown non-existent room with 404 ROOM_NOT_FOUND', async () => {
    const resUnknownRoom = await request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.SYSTEM_ADMIN}`)
      .send({
        event: {
          roomId: 'non-existent-room-999',
          reason: 'Valid emergency closure reason',
        },
      });

    expect(resUnknownRoom.status).toBe(404);
    expect(resUnknownRoom.body.success).toBe(false);
    expect(resUnknownRoom.body.error?.code).toBe('ROOM_NOT_FOUND');
  });

  it('Scenario 15: executes disruption recovery for authorized role (SYSTEM_ADMIN) returning 200 OK with RecoveryReport', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.SYSTEM_ADMIN}`)
      .send({
        event: {
          roomId: 'room-101',
          reason: 'Water pipe burst in lecture hall',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.closedRoomId).toBe('room-101');
    expect(Array.isArray(res.body.data.reassignedBookings)).toBe(true);
    expect(Array.isArray(res.body.data.unresolvedBookingIds)).toBe(true);
    expect(typeof res.body.data.unaffectedAssignmentsPreservedCount).toBe('number');
    expect(typeof res.body.data.totalAssignmentsChangedCount).toBe('number');
  });

  it('Scenario 11: Controlled parallel recovery requests handle concurrency safely', async () => {
    const req1 = request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.SYSTEM_ADMIN}`)
      .send({
        event: { roomId: 'room-101', reason: 'Parallel event 1' },
      });

    const req2 = request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.HOD}`)
      .send({
        event: { roomId: 'room-102', reason: 'Parallel event 2' },
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res2.body.success).toBe(true);
  });
});
