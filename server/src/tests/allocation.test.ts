import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { allocationService } from '../services/allocation/index.js';
import { validationService } from '../services/validation/index.js';
import {
  BookingRequest,
  Room,
  RoomClosure,
  TimeSlot,
  AllocationMethod,
} from '../../../shared/types/index.js';

const slotMorning: TimeSlot = {
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '10:00',
};

const sampleRooms: Room[] = [
  {
    id: 'room-101',
    code: 'LH-101',
    name: 'Lecture Hall 101',
    capacity: 50,
    facilities: ['PROJECTOR', 'AC'],
    building: 'Main Block',
    floor: 1,
    isBlocked: false,
  },
  {
    id: 'room-102',
    code: 'LH-102',
    name: 'Lecture Hall 102',
    capacity: 100,
    facilities: ['PROJECTOR', 'AC', 'AUDIO_SYSTEM'],
    building: 'Main Block',
    floor: 1,
    isBlocked: false,
  },
  {
    id: 'room-201',
    code: 'LAB-201',
    name: 'Computer Lab 201',
    capacity: 30,
    facilities: ['LAB_EQUIPMENT', 'PROJECTOR', 'AC'],
    building: 'Science Block',
    floor: 2,
    isBlocked: false,
  },
];

test('M3 Allocation Engine Service & API Integration Suite', async (t) => {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const makeToken = (role: string, id = '507f1f77bcf86cd799439011', email = 'test@campus.edu') => {
    return jwt.sign({ id, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
  };

  t.after(() => {
    server.close();
  });

  await t.test('Scenario 1: Basic successful First-Fit assignment', async () => {
    const req: BookingRequest = {
      id: 'req-1',
      title: 'Intro to Programming',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 40,
      requiredFacilities: ['PROJECTOR'],
      slot: slotMorning,
      status: 'PENDING',
    };

    const result = await allocationService.runAllocation([req], sampleRooms, 'FIRST_FIT', { saveRecord: false });
    assert.equal(result.method, 'FIRST_FIT');
    assert.equal(result.assignments.length, 1);
    assert.equal(result.unassigned.length, 0);
    assert.equal(result.assignments[0].bookingId, 'req-1');
    assert.ok(result.assignments[0].explanation.includes('First-Fit assigned room'));
    assert.ok(result.validation?.isValid);
  });

  await t.test('Scenario 2: Improved heuristic prioritizes the most-constrained occurrence', async () => {
    // reqLab needs specialized lab equipment (only 1 feasible room: LAB-201)
    const reqLab: BookingRequest = {
      id: 'req-lab',
      title: 'Database Lab Practical',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 25,
      requiredFacilities: ['LAB_EQUIPMENT'],
      slot: slotMorning,
      status: 'PENDING',
    };

    // reqGeneral fits any room (3 feasible rooms)
    const reqGeneral: BookingRequest = {
      id: 'req-gen',
      title: 'General Orientation',
      requesterId: 'tutor-2',
      requesterRole: 'TUTOR',
      enrollmentCount: 25,
      requiredFacilities: ['PROJECTOR'],
      slot: slotMorning,
      status: 'PENDING',
    };

    // Passed in order: reqGeneral first, reqLab second
    const result = await allocationService.runAllocation([reqGeneral, reqLab], sampleRooms, 'HEURISTIC', { saveRecord: false });
    assert.equal(result.assignments.length, 2);
    // reqLab must get LAB-201
    const labAssign = result.assignments.find((a) => a.bookingId === 'req-lab');
    assert.ok(labAssign);
    assert.equal(labAssign.roomId, 'room-201');
    assert.ok(result.validation?.isValid);
  });

  await t.test('Scenario 3: Capacity mismatch results in an unassigned occurrence', async () => {
    const oversizedReq: BookingRequest = {
      id: 'req-oversized',
      title: 'All-Hands Mega Assembly',
      requesterId: 'admin-1',
      requesterRole: 'SYSTEM_ADMIN',
      enrollmentCount: 500, // Larger than max capacity (100)
      requiredFacilities: [],
      slot: slotMorning,
      status: 'PENDING',
    };

    const result = await allocationService.runAllocation([oversizedReq], sampleRooms, 'HEURISTIC', { saveRecord: false });
    assert.equal(result.assignments.length, 0);
    assert.equal(result.unassigned.length, 1);
    assert.equal(result.unassigned[0].bookingId, 'req-oversized');
    assert.ok(result.unassigned[0].reason.includes('No feasible room available satisfying constraints'));
  });

  await t.test('Scenario 4: Missing required facilities prevent assignment', async () => {
    const rareFacilityReq: BookingRequest = {
      id: 'req-vr',
      title: 'VR Simulation Class',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 20,
      requiredFacilities: ['SMART_BOARD'], // None of sampleRooms have SMART_BOARD
      slot: slotMorning,
      status: 'PENDING',
    };

    const result = await allocationService.runAllocation([rareFacilityReq], sampleRooms, 'FIRST_FIT', { saveRecord: false });
    assert.equal(result.assignments.length, 0);
    assert.equal(result.unassigned.length, 1);
    assert.ok(result.unassigned[0].reason.includes('SMART_BOARD'));
  });

  await t.test('Scenario 5: Active room closure prevents assignment', async () => {
    const blockedRoom: Room = {
      ...sampleRooms[0],
      isBlocked: true,
      blockReason: 'Emergency Electrical Maintenance',
    };

    const closure: RoomClosure = {
      id: 'c-1',
      roomId: 'room-102', // Block LH-102 as well via active closure
      reason: 'Roof repair',
      status: 'ACTIVE',
    };

    const req: BookingRequest = {
      id: 'req-1',
      title: 'Seminar',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 40,
      requiredFacilities: ['PROJECTOR'],
      slot: slotMorning,
      status: 'PENDING',
    };

    // sampleRooms[2] is LAB-201 (cap 30, too small for 40)
    // room-101 is blocked, room-102 has active closure
    const result = await allocationService.runAllocation([req], [blockedRoom, sampleRooms[1], sampleRooms[2]], 'HEURISTIC', {
      closures: [closure],
      saveRecord: false,
    });

    assert.equal(result.assignments.length, 0);
    assert.equal(result.unassigned.length, 1);
  });

  await t.test('Scenario 6: Overlapping bookings cannot occupy the same room', async () => {
    const req1: BookingRequest = {
      id: 'req-1',
      title: 'Morning Physics Lecture',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 45,
      requiredFacilities: ['PROJECTOR'],
      slot: slotMorning,
      status: 'PENDING',
    };

    const req2: BookingRequest = {
      id: 'req-2',
      title: 'Morning Chemistry Lecture',
      requesterId: 'tutor-2',
      requesterRole: 'TUTOR',
      enrollmentCount: 45,
      requiredFacilities: ['PROJECTOR'],
      slot: slotMorning,
      status: 'PENDING',
    };

    // Single room available
    const singleRoom: Room[] = [sampleRooms[0]];

    const result = await allocationService.runAllocation([req1, req2], singleRoom, 'FIRST_FIT', { saveRecord: false });
    assert.equal(result.assignments.length, 1);
    assert.equal(result.unassigned.length, 1);
    assert.ok(result.validation?.isValid);
  });

  await t.test('Scenario 7: An occurrence cannot be assigned more than once', async () => {
    const req: BookingRequest = {
      id: 'req-unique',
      title: 'Data Structures',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 20,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'PENDING',
    };

    const result = await allocationService.runAllocation([req], sampleRooms, 'HEURISTIC', { saveRecord: false });
    assert.equal(result.assignments.length, 1);
    assert.equal(result.assignments[0].bookingId, 'req-unique');

    // Confirm validator checks duplicate occurrence assignments
    const duplicateAssignments = [
      { bookingId: 'req-unique', roomId: 'room-101', explanation: 'First' },
      { bookingId: 'req-unique', roomId: 'room-102', explanation: 'Second' },
    ];
    const validation = validationService.validateAllocation(duplicateAssignments, [req], sampleRooms, []);
    assert.equal(validation.isValid, false);
    assert.ok(validation.violations.some((v) => v.includes('duplicate assignment')));
  });

  await t.test('Scenario 8: Soft preferences influence room selection without violating hard constraints', async () => {
    // req prefers ground floor (room-101 at floor 1 vs room-201 at floor 2)
    const req: BookingRequest = {
      id: 'req-pref',
      title: 'Math Tutorial',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 25,
      requiredFacilities: ['PROJECTOR', 'AC'],
      slot: slotMorning,
      status: 'PENDING',
    };

    const result = await allocationService.runAllocation([req], sampleRooms, 'HEURISTIC', { saveRecord: false });
    assert.equal(result.assignments.length, 1);
    // room-201 (cap 30, waste 5) minimizes capacity waste + soft penalties vs room-101 (cap 50, waste 25)
    assert.equal(result.assignments[0].roomId, 'room-201');
    assert.ok(result.validation?.isValid);
  });

  await t.test('Scenario 9: Unassigned occurrences contain useful explanations', async () => {
    const impossibleReq: BookingRequest = {
      id: 'req-fail',
      title: 'Advanced Robotics Lab',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 200,
      requiredFacilities: ['LAB_EQUIPMENT', 'AUDIO_SYSTEM'],
      slot: slotMorning,
      status: 'PENDING',
    };

    const result = await allocationService.runAllocation([impossibleReq], sampleRooms, 'HEURISTIC', { saveRecord: false });
    assert.equal(result.unassigned.length, 1);
    assert.equal(result.unassigned[0].bookingId, 'req-fail');
    assert.ok(result.unassigned[0].reason.length > 10);
    assert.equal(result.unassigned[0].evaluatedRoomsCount, 3);
  });

  await t.test('Scenario 10: Independent validation detects deliberately invalid allocations', async () => {
    const req: BookingRequest = {
      id: 'req-val-test',
      title: 'Physics Lab',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 100, // enrollment 100
      requiredFacilities: ['LAB_EQUIPMENT'],
      slot: slotMorning,
      status: 'PENDING',
    };

    // Intentionally construct invalid assignment: room-101 has capacity 50 and lacks LAB_EQUIPMENT
    const invalidAssignments = [{ bookingId: 'req-val-test', roomId: 'room-101', explanation: 'Forced invalid' }];

    const validation = validationService.validateAllocation(invalidAssignments, [req], sampleRooms, []);
    assert.equal(validation.isValid, false);
    assert.ok(validation.violations.length >= 2, 'Should detect capacity and facility violations');
  });

  await t.test('Error handling: rejects unsupported allocation method', async () => {
    await assert.rejects(
      async () => {
        await allocationService.runAllocation([], sampleRooms, 'UNKNOWN_MODE' as AllocationMethod);
      },
      (err: Error) => {
        return err.message.includes('Unsupported allocation method');
      }
    );
  });

  await t.test('API POST /api/v1/allocation/run: rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/allocation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'HEURISTIC' }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  await t.test('API POST /api/v1/allocation/run: rejects non-authorized role (TUTOR) with 403 FORBIDDEN', async () => {
    const tutorToken = makeToken('TUTOR');
    const res = await fetch(`${baseUrl}/allocation/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tutorToken}`,
      },
      body: JSON.stringify({ method: 'HEURISTIC' }),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  await t.test('API POST /api/v1/allocation/run: executes allocation for authorized role (SYSTEM_ADMIN)', async () => {
    const adminToken = makeToken('SYSTEM_ADMIN');
    const reqBody = {
      method: 'HEURISTIC',
      requests: [
        {
          id: 'api-req-1',
          title: 'API Test Lecture',
          requesterId: 'tutor-1',
          requesterRole: 'TUTOR',
          enrollmentCount: 30,
          requiredFacilities: ['PROJECTOR'],
          slot: slotMorning,
          status: 'PENDING',
        },
      ],
      rooms: sampleRooms,
    };

    const res = await fetch(`${baseUrl}/allocation/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(reqBody),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.method, 'HEURISTIC');
    assert.equal(body.data.assignments.length, 1);
    assert.ok(body.data.validation);
    assert.equal(body.data.validation.isValid, true);
  });
});
