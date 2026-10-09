import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';

test('API Authentication, RBAC, and Input Validation Suite', async (t) => {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const makeToken = (role: string, id = '507f1f77bcf86cd799439011', email = 'test@campus.edu') => {
    return jwt.sign({ id, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
  };

  t.after(() => {
    server.close();
  });

  await t.test('GET /rooms: rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/rooms`);
    assert.equal(res.status, 401);

    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  await t.test('GET /rooms: rejects invalid Bearer token with 401 INVALID_TOKEN', async () => {
    const res = await fetch(`${baseUrl}/rooms`, {
      headers: { Authorization: 'Bearer this-is-not-a-valid-token' },
    });
    assert.equal(res.status, 401);

    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_TOKEN');
  });

  await t.test('POST /rooms: rejects non-admin role (TUTOR) with 403 FORBIDDEN', async () => {
    const tutorToken = makeToken('TUTOR');
    const res = await fetch(`${baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tutorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'NEW-101',
        name: 'New Room',
        capacity: 40,
        facilities: ['PROJECTOR'],
        building: 'Main Block',
        floor: 1,
      }),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'FORBIDDEN');
    assert.ok(body.error.message.includes('TUTOR'));
  });

  await t.test('PATCH /rooms/:id/block: rejects unauthorized roles with 403 FORBIDDEN', async () => {
    const studentToken = makeToken('STUDENT_REP');
    const res = await fetch(`${baseUrl}/rooms/MAIN-101/block`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isBlocked: true, reason: 'Test' }),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  await t.test('POST /rooms: rejects malformed payload with 400 VALIDATION_ERROR', async () => {
    const adminToken = makeToken('SYSTEM_ADMIN');
    const res = await fetch(`${baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'A', // too short (min 2)
        // missing name, capacity, building
      }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('POST /bookings: rejects inverted time slot with 400 VALIDATION_ERROR', async () => {
    const tutorToken = makeToken('TUTOR');
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tutorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Inverted Slot Class',
        enrollmentCount: 30,
        requiredFacilities: ['PROJECTOR'],
        slot: {
          dayOfWeek: 'MONDAY',
          startTime: '11:00',
          endTime: '09:00', // endTime is before startTime
        },
      }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('POST /validation/validate: accepts validation payload format and executes validator', async () => {
    const adminToken = makeToken('SYSTEM_ADMIN');
    const res = await fetch(`${baseUrl}/validation/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assignments: [
          {
            bookingId: '507f1f77bcf86cd799439011',
            roomId: '507f1f77bcf86cd799439012',
            explanation: 'Candidate test assignment',
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    // Since mock IDs do not exist in DB during unit test, validator detects missing booking/room
    assert.equal(body.data.isValid, false);
    assert.ok(body.data.violations.length > 0);
  });
});
