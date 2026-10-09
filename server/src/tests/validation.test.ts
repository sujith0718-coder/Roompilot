import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validationService,
  doSlotsOverlap,
} from '../services/validation/index.js';
import {
  BookingRequest,
  Room,
  AllocationAssignment,
  RoomClosure,
} from '../../../shared/types/index.js';

test('Independent Hard-Constraint Validator Suite', async (t) => {
  const sampleRooms: Room[] = [
    {
      id: 'room-1',
      code: 'MAIN-101',
      name: 'Main Hall',
      capacity: 100,
      facilities: ['PROJECTOR', 'AC', 'AUDIO_SYSTEM'],
      building: 'Main Block',
      floor: 1,
      isBlocked: false,
    },
    {
      id: 'room-2',
      code: 'LAB-201',
      name: 'Computer Lab',
      capacity: 40,
      facilities: ['LAB_EQUIPMENT', 'PROJECTOR', 'AC'],
      building: 'Science Complex',
      floor: 2,
      isBlocked: false,
    },
    {
      id: 'room-blocked',
      code: 'ENG-301',
      name: 'Engineering Room',
      capacity: 60,
      facilities: ['PROJECTOR'],
      building: 'Engineering Hall',
      floor: 3,
      isBlocked: true,
      blockReason: 'Maintenance in progress',
    },
  ];

  const sampleBookings: BookingRequest[] = [
    {
      id: 'booking-1',
      title: 'CS101 Lecture',
      requesterId: 'user-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 80,
      requiredFacilities: ['PROJECTOR', 'AC'],
      slot: {
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '10:00',
      },
      status: 'PENDING',
      createdAt: '2026-10-09T09:00:00Z',
    },
    {
      id: 'booking-2',
      title: 'CS201 Lab Practical',
      requesterId: 'user-2',
      requesterRole: 'TUTOR',
      enrollmentCount: 35,
      requiredFacilities: ['LAB_EQUIPMENT'],
      slot: {
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '12:00',
      },
      status: 'PENDING',
      createdAt: '2026-10-09T09:00:00Z',
    },
    {
      id: 'booking-overlap',
      title: 'Math Seminar (Conflicting Slot)',
      requesterId: 'user-3',
      requesterRole: 'TUTOR',
      enrollmentCount: 50,
      requiredFacilities: ['PROJECTOR'],
      slot: {
        dayOfWeek: 'MONDAY',
        startTime: '09:30',
        endTime: '10:30',
      },
      status: 'PENDING',
      createdAt: '2026-10-09T09:00:00Z',
    },
    {
      id: 'booking-adjacent',
      title: 'Physics Tutorial (Adjacent Slot)',
      requesterId: 'user-4',
      requesterRole: 'TUTOR',
      enrollmentCount: 40,
      requiredFacilities: ['PROJECTOR'],
      slot: {
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
      },
      status: 'PENDING',
      createdAt: '2026-10-09T09:00:00Z',
    },
  ];

  await t.test('Slot overlap helper computes strict interval overlap correctly', () => {
    // Overlapping: 09:00-10:00 vs 09:30-10:30
    assert.equal(
      doSlotsOverlap(
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 'MONDAY', startTime: '09:30', endTime: '10:30' }
      ),
      true
    );

    // Adjacent non-overlapping: 09:00-10:00 vs 10:00-11:00
    assert.equal(
      doSlotsOverlap(
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '11:00' }
      ),
      false
    );

    // Different day: 09:00-10:00 on MONDAY vs 09:00-10:00 on TUESDAY
    assert.equal(
      doSlotsOverlap(
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '10:00' }
      ),
      false
    );

    // Different dates on same day
    assert.equal(
      doSlotsOverlap(
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00', date: '2026-10-12' },
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00', date: '2026-10-19' }
      ),
      false
    );
  });

  await t.test('Accepts a valid allocation conforming to all hard constraints', () => {
    const validAssignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'room-1', explanation: 'Fit' },
      { bookingId: 'booking-2', roomId: 'room-2', explanation: 'Lab fit' },
    ];

    const result = validationService.validateAllocation(
      validAssignments,
      sampleBookings,
      sampleRooms
    );

    assert.equal(result.isValid, true);
    assert.equal(result.violations.length, 0);
    assert.equal(result.details?.length, 0);
  });

  await t.test('Permits adjacent time slots in the same room', () => {
    const adjacentAssignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'room-1', explanation: '09:00 - 10:00' },
      { bookingId: 'booking-adjacent', roomId: 'room-1', explanation: '10:00 - 11:00' },
    ];

    const result = validationService.validateAllocation(
      adjacentAssignments,
      sampleBookings,
      sampleRooms
    );

    assert.equal(result.isValid, true);
    assert.equal(result.violations.length, 0);
  });

  await t.test('Rejects allocation when room capacity is smaller than enrollment', () => {
    // booking-1 (enrollment 80) into room-2 (capacity 40)
    const assignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'room-2', explanation: 'Capacity test' },
    ];

    const result = validationService.validateAllocation(assignments, sampleBookings, sampleRooms);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.includes('capacity (40) is insufficient for enrollment (80)')));
    assert.ok(result.details?.some((d) => d.constraintType === 'CAPACITY' && d.bookingId === 'booking-1'));
  });

  await t.test('Rejects allocation when room lacks required facilities', () => {
    // booking-2 requires LAB_EQUIPMENT, but room-1 only has PROJECTOR, AC, AUDIO_SYSTEM
    const assignments: AllocationAssignment[] = [
      { bookingId: 'booking-2', roomId: 'room-1', explanation: 'Facility test' },
    ];

    const result = validationService.validateAllocation(assignments, sampleBookings, sampleRooms);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.includes('lacks required facilities: LAB_EQUIPMENT')));
    assert.ok(result.details?.some((d) => d.constraintType === 'FACILITY' && d.bookingId === 'booking-2'));
  });

  await t.test('Rejects allocation for closed or blocked room (isBlocked: true)', () => {
    const assignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'room-blocked', explanation: 'Blocked room test' },
    ];

    const result = validationService.validateAllocation(assignments, sampleBookings, sampleRooms);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.includes('closed or blocked (Maintenance in progress)')));
    assert.ok(result.details?.some((d) => d.constraintType === 'ROOM_CLOSED'));
  });

  await t.test('Rejects allocation for room with an active RoomClosure record', () => {
    const closures: RoomClosure[] = [
      {
        id: 'closure-1',
        roomId: 'room-1',
        reason: 'Emergency water leakage',
        status: 'ACTIVE',
      },
    ];

    const assignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'room-1', explanation: 'Closure test' },
    ];

    const result = validationService.validateAllocation(
      assignments,
      sampleBookings,
      sampleRooms,
      closures
    );

    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.includes('active closure (Emergency water leakage)')));
    assert.ok(result.details?.some((d) => d.constraintType === 'ROOM_CLOSED'));
  });

  await t.test('Ignores resolved RoomClosure records', () => {
    const resolvedClosures: RoomClosure[] = [
      {
        id: 'closure-resolved',
        roomId: 'room-1',
        reason: 'Water leak resolved',
        status: 'RESOLVED',
      },
    ];

    const assignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'room-1', explanation: 'Resolved test' },
    ];

    const result = validationService.validateAllocation(
      assignments,
      sampleBookings,
      sampleRooms,
      resolvedClosures
    );

    assert.equal(result.isValid, true);
  });

  await t.test('Rejects overlapping bookings assigned to the same room', () => {
    // booking-1 (09:00-10:00) and booking-overlap (09:30-10:30) both assigned to room-1
    const assignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'room-1', explanation: 'First assignment' },
      { bookingId: 'booking-overlap', roomId: 'room-1', explanation: 'Conflicting assignment' },
    ];

    const result = validationService.validateAllocation(assignments, sampleBookings, sampleRooms);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.includes('Overlapping booking in room')));
    assert.ok(result.details?.some((d) => d.constraintType === 'OVERLAP'));
  });

  await t.test('Rejects duplicate assignments for the same class occurrence', () => {
    // booking-1 assigned to room-1 AND to room-2
    const assignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'room-1', explanation: 'Assignment A' },
      { bookingId: 'booking-1', roomId: 'room-2', explanation: 'Assignment B (Duplicate)' },
    ];

    const result = validationService.validateAllocation(assignments, sampleBookings, sampleRooms);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.includes('assigned more than once (duplicate assignment)')));
    assert.ok(result.details?.some((d) => d.constraintType === 'DUPLICATE_ASSIGNMENT'));
  });

  await t.test('Detects reference to a missing room', () => {
    const assignments: AllocationAssignment[] = [
      { bookingId: 'booking-1', roomId: 'non-existent-room-999', explanation: 'Ghost room' },
    ];

    const result = validationService.validateAllocation(assignments, sampleBookings, sampleRooms);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.includes("Room ID 'non-existent-room-999' assigned to 'CS101 Lecture' does not exist")));
    assert.ok(result.details?.some((d) => d.constraintType === 'MISSING_ROOM'));
  });

  await t.test('Detects reference to a missing class occurrence / booking', () => {
    const assignments: AllocationAssignment[] = [
      { bookingId: 'ghost-booking-777', roomId: 'room-1', explanation: 'Ghost booking' },
    ];

    const result = validationService.validateAllocation(assignments, sampleBookings, sampleRooms);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.includes("Class occurrence / booking ID 'ghost-booking-777' does not exist")));
    assert.ok(result.details?.some((d) => d.constraintType === 'MISSING_BOOKING'));
  });

  await t.test('Single-assignment validation service checks capacity, facility, closures, and overlaps', () => {
    const validResult = validationService.validateAssignment(
      sampleBookings[0],
      sampleRooms[0],
      []
    );
    assert.equal(validResult.isValid, true);

    const blockedResult = validationService.validateAssignment(
      sampleBookings[0],
      sampleRooms[2],
      []
    );
    assert.equal(blockedResult.isValid, false);
    assert.ok(blockedResult.violations.some((v) => v.includes('closed or blocked')));

    const overlapResult = validationService.validateAssignment(
      sampleBookings[0],
      sampleRooms[0],
      [{ roomId: 'room-1', slot: { dayOfWeek: 'MONDAY', startTime: '09:15', endTime: '09:45' } }]
    );
    assert.equal(overlapResult.isValid, false);
    assert.ok(overlapResult.violations.some((v) => v.includes('overlapping booking')));
  });
});
