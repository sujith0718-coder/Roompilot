import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { testTokens } from '../helpers/testTokens.js';

describe('API Integration — Disruption Recovery Endpoint (/api/v1/recovery/reassign)', () => {
  it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
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

  it('rejects unauthorized role (TUTOR) with 403 FORBIDDEN', async () => {
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

  it('rejects malformed payload (missing reason / invalid roomId) with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/reassign')
      .set('Authorization', `Bearer ${testTokens.SYSTEM_ADMIN}`)
      .send({
        event: {
          roomId: '',
          reason: 'No', // Too short (< 3 chars)
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('executes disruption recovery for authorized role (SYSTEM_ADMIN) returning 200 OK with RecoveryReport', async () => {
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
});
