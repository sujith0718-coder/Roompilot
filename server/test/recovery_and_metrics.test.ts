import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BookingRequest,
  DisruptionEvent,
  Room,
  AllocationResult,
} from '../../shared/types/index.js';
import { recoveryService, timeSlotsOverlap } from '../src/services/recovery/index.js';
import { metricsService } from '../src/services/metrics/index.js';
import { validationService } from '../src/services/validation/index.js';

describe('Disruption Recovery Service (M5)', () => {
  const sampleRooms: Room[] = [
    {
      id: 'room-101',
      code: 'R101',
      name: 'Lecture Hall 101',
      capacity: 60,
      facilities: ['PROJECTOR', 'AC'],
      building: 'Science Block',
      floor: 1,
      isBlocked: false,
    },
    {
      id: 'room-102',
      code: 'R102',
      name: 'Seminar Room 102',
      capacity: 40,
      facilities: ['PROJECTOR', 'AC', 'SMART_BOARD'],
      building: 'Science Block',
      floor: 1,
      isBlocked: false,
    },
    {
      id: 'room-201',
      code: 'R201',
      name: 'Computer Lab 201',
      capacity: 30,
      facilities: ['LAB_EQUIPMENT', 'AC', 'PROJECTOR'],
      building: 'Tech Tower',
      floor: 2,
      isBlocked: false,
    },
    {
      id: 'room-blocked',
      code: 'R_BLOCKED',
      name: 'Renovation Room',
      capacity: 100,
      facilities: ['PROJECTOR'],
      building: 'Main Block',
      floor: 1,
      isBlocked: true,
      blockReason: 'Painting in progress',
    },
  ];

  it('correctly calculates time slot overlaps', () => {
    // Exact overlap
    assert.equal(
      timeSlotsOverlap(
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' }
      ),
      true
    );

    // Partial overlap
    assert.equal(
      timeSlotsOverlap(
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:30' },
        { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '11:00' }
      ),
      true
    );

    // Adjacent / touching boundary (non-overlapping)
    assert.equal(
      timeSlotsOverlap(
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '11:00' }
      ),
      false
    );

    // Different day
    assert.equal(
      timeSlotsOverlap(
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '10:00' }
      ),
      false
    );
  });

  it('succeeds with recovery when valid alternative exists (single room change, preserving others)', () => {
    const requests: BookingRequest[] = [
      {
        id: 'book-1',
        title: 'Physics 101',
        requesterId: 'u1',
        requesterRole: 'TUTOR',
        enrollmentCount: 35,
        requiredFacilities: ['PROJECTOR'],
        slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        status: 'ALLOCATED',
        assignedRoomId: 'room-101',
        createdAt: '2026-10-09T00:00:00Z',
      },
      {
        id: 'book-2',
        title: 'Chemistry Lab',
        requesterId: 'u2',
        requesterRole: 'TUTOR',
        enrollmentCount: 25,
        requiredFacilities: ['LAB_EQUIPMENT'],
        slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        status: 'ALLOCATED',
        assignedRoomId: 'room-201',
        createdAt: '2026-10-09T00:00:00Z',
      },
    ];

    const event: DisruptionEvent = {
      roomId: 'room-101',
      reason: 'Air conditioning water leakage',
    };

    const report = recoveryService.recoverDisruption(event, requests, sampleRooms);

    assert.equal(report.closedRoomId, 'room-101');
    assert.deepEqual(report.affectedBookingIds, ['book-1']);
    assert.equal(report.reassignedBookings.length, 1);
    assert.equal(report.reassignedBookings[0].bookingId, 'book-1');
    assert.equal(report.reassignedBookings[0].newRoomId, 'room-102'); // R102 has capacity 40 (minimal waste)
    assert.equal(report.unresolvedBookingIds.length, 0);
    assert.equal(report.unaffectedAssignmentsPreservedCount, 1); // book-2 remains preserved
    assert.equal(report.totalAssignmentsChangedCount, 1);

    // Validate using M4 validator
    const chosenRoom = sampleRooms.find((r) => r.id === report.reassignedBookings[0].newRoomId)!;
    const validation = validationService.validateAssignment(requests[0], chosenRoom, []);
    assert.equal(validation.isValid, true);
  });

  it('preserves bookings outside the closed time range when disruption slot is specified', () => {
    const requests: BookingRequest[] = [
      {
        id: 'book-morning',
        title: 'Morning Class in R101',
        requesterId: 'u1',
        requesterRole: 'TUTOR',
        enrollmentCount: 30,
        requiredFacilities: ['PROJECTOR'],
        slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        status: 'ALLOCATED',
        assignedRoomId: 'room-101',
        createdAt: '2026-10-09T00:00:00Z',
      },
      {
        id: 'book-afternoon',
        title: 'Afternoon Class in R101',
        requesterId: 'u2',
        requesterRole: 'TUTOR',
        enrollmentCount: 30,
        requiredFacilities: ['PROJECTOR'],
        slot: { dayOfWeek: 'MONDAY', startTime: '14:00', endTime: '15:00' },
        status: 'ALLOCATED',
        assignedRoomId: 'room-101',
        createdAt: '2026-10-09T00:00:00Z',
      },
    ];

    // Close room ONLY for 09:00 - 10:00
    const event: DisruptionEvent = {
      roomId: 'room-101',
      slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
      reason: 'Temporary inspection',
    };

    const report = recoveryService.recoverDisruption(event, requests, sampleRooms);

    assert.deepEqual(report.affectedBookingIds, ['book-morning']);
    assert.equal(report.reassignedBookings.length, 1);
    assert.equal(report.reassignedBookings[0].bookingId, 'book-morning');
    assert.equal(report.unaffectedAssignmentsPreservedCount, 1); // Afternoon class untouched in room-101
  });

  it('reports unresolved bookings with clear reason when recovery is impossible', () => {
    // Class requires 55 students and LAB_EQUIPMENT. Only room-101 (cap 60) had capacity, but lacks lab.
    // If room-101 closes, room-201 has lab equipment but capacity only 30.
    const requests: BookingRequest[] = [
      {
        id: 'book-large-lab',
        title: 'Advanced Robotics',
        requesterId: 'u1',
        requesterRole: 'TUTOR',
        enrollmentCount: 55,
        requiredFacilities: ['LAB_EQUIPMENT'],
        slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        status: 'ALLOCATED',
        assignedRoomId: 'room-101',
        createdAt: '2026-10-09T00:00:00Z',
      },
    ];

    const event: DisruptionEvent = {
      roomId: 'room-101',
      reason: 'Emergency closure',
    };

    const report = recoveryService.recoverDisruption(event, requests, sampleRooms);

    assert.equal(report.reassignedBookings.length, 0);
    assert.equal(report.unresolvedBookingIds.length, 1);
    assert.equal(report.unresolvedBookingIds[0].bookingId, 'book-large-lab');
    assert.match(report.unresolvedBookingIds[0].reason, /hard constraints|capacity|facilities/i);
    assert.equal(report.totalAssignmentsChangedCount, 0);
  });

  it('handles edge case: no changes required when closing an unassigned room', () => {
    const requests: BookingRequest[] = [
      {
        id: 'book-1',
        title: 'Maths in R102',
        requesterId: 'u1',
        requesterRole: 'TUTOR',
        enrollmentCount: 20,
        requiredFacilities: [],
        slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        status: 'ALLOCATED',
        assignedRoomId: 'room-102',
        createdAt: '2026-10-09T00:00:00Z',
      },
    ];

    const event: DisruptionEvent = {
      roomId: 'room-101', // No bookings were using room-101
      reason: 'Routine inspection',
    };

    const report = recoveryService.recoverDisruption(event, requests, sampleRooms);

    assert.equal(report.affectedBookingIds.length, 0);
    assert.equal(report.reassignedBookings.length, 0);
    assert.equal(report.unresolvedBookingIds.length, 0);
    assert.equal(report.unaffectedAssignmentsPreservedCount, 1);
    assert.equal(report.totalAssignmentsChangedCount, 0);
  });
});

describe('Metrics Calculation Service (M5)', () => {
  const rooms: Room[] = [
    {
      id: 'r1',
      code: 'R1',
      name: 'Room 1',
      capacity: 50,
      facilities: ['PROJECTOR'],
      building: 'Science',
      floor: 1,
      isBlocked: false,
    },
    {
      id: 'r2',
      code: 'R2',
      name: 'Room 2',
      capacity: 40,
      facilities: ['AC'],
      building: 'Arts',
      floor: 1,
      isBlocked: false,
    },
  ];

  it('handles zero denominators safely without NaN or Infinity', () => {
    const metrics = metricsService.calculateMetrics([], []);

    assert.equal(metrics.totalOccurrences, 0);
    assert.equal(metrics.assignedOccurrences, 0);
    assert.equal(metrics.allocationSuccessRate, 0);
    assert.equal(metrics.seatUtilization, 0);
    assert.equal(metrics.capacityWasteTotal, 0);
    assert.equal(metrics.capacityWasteAverage, 0);
    assert.equal(metrics.roomTimeUtilization, 0);
    assert.equal(metrics.preferenceSatisfaction, 100); // 100% neutral when no preferences apply
    assert.equal(Number.isNaN(metrics.allocationSuccessRate), false);
    assert.equal(Number.isNaN(metrics.seatUtilization), false);
    assert.equal(Number.isNaN(metrics.roomTimeUtilization), false);
  });

  it('matches manually verifiable calculations on standard fixtures', () => {
    // 2 bookings:
    // b1: enrollment 40 in r1 (capacity 50) -> waste = 10, enrolled = 40, cap = 50
    // b2: enrollment 30 in r2 (capacity 40) -> waste = 10, enrolled = 30, cap = 40
    // b3: unassigned (enrollment 20) -> hard constraint conflict
    const requests: BookingRequest[] = [
      {
        id: 'b1',
        title: 'Class 1',
        requesterId: 'u1',
        requesterRole: 'TUTOR',
        department: 'Science',
        enrollmentCount: 40,
        requiredFacilities: ['PROJECTOR'],
        slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        status: 'ALLOCATED',
        assignedRoomId: 'r1',
        createdAt: '2026-10-09T00:00:00Z',
      },
      {
        id: 'b2',
        title: 'Class 2',
        requesterId: 'u2',
        requesterRole: 'TUTOR',
        department: 'Arts',
        enrollmentCount: 30,
        requiredFacilities: ['AC'],
        slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        status: 'ALLOCATED',
        assignedRoomId: 'r2',
        createdAt: '2026-10-09T00:00:00Z',
      },
      {
        id: 'b3',
        title: 'Class 3',
        requesterId: 'u3',
        requesterRole: 'TUTOR',
        department: 'Engineering',
        enrollmentCount: 20,
        requiredFacilities: [],
        slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
        status: 'PENDING',
        assignedRoomId: undefined,
        createdAt: '2026-10-09T00:00:00Z',
      },
    ];

    const metrics = metricsService.calculateMetrics(requests, rooms, 1);

    // Allocation success rate: 2 / 3 * 100 = 66.67%
    assert.equal(metrics.allocationSuccessRate, 66.67);

    // Seat utilization: (40 + 30) / (50 + 40) * 100 = 70 / 90 * 100 = 77.78%
    assert.equal(metrics.seatUtilization, 77.78);

    // Capacity waste total: (50 - 40) + (40 - 30) = 20
    assert.equal(metrics.capacityWasteTotal, 20);

    // Capacity waste average: 20 / 2 = 10
    assert.equal(metrics.capacityWasteAverage, 10);

    // Room-time utilization:
    // Distinct slots in schedule: 1 (MONDAY 09:00-10:00)
    // Operational rooms: 2
    // Available room-time slots: 2 * 1 = 2
    // Occupied room-time slots: r1 and r2 both occupied during this slot = 2
    // Room-time utilization: 2 / 2 * 100 = 100%
    assert.equal(metrics.roomTimeUtilization, 100);

    // Differentiates seat utilization (77.78%) vs room-time utilization (100%)
    assert.notEqual(metrics.seatUtilization, metrics.roomTimeUtilization);

    // Conflict count: 1 unassigned
    assert.equal(metrics.hardConstraintConflictCount, 1);

    // Preference satisfaction:
    // b1: dept Science in Science (affinity: yes), capacity 50 <= 40*2 (yes) -> 2/2 met
    // b2: dept Arts in Arts (affinity: yes), capacity 40 <= 30*2 (yes) -> 2/2 met
    // Total applicable: 4, met: 4 -> 100%
    assert.equal(metrics.preferenceSatisfaction, 100);

    // Recovery disruption count:
    assert.equal(metrics.recoveryDisruptionCount, 1);
  });
});

describe('Baseline vs Heuristic Comparison Service (M5)', () => {
  it('correctly compares First-Fit and Improved Heuristic runs on identical inputs', () => {
    const baselineResult: AllocationResult = {
      method: 'FIRST_FIT',
      assignments: [
        { bookingId: 'b1', roomId: 'r-large', explanation: 'First fit' },
        { bookingId: 'b2', roomId: 'r-small', explanation: 'First fit' },
      ],
      unassigned: [{ bookingId: 'b3', reason: 'No fit', evaluatedRoomsCount: 2 }],
      metrics: {
        totalRequested: 3,
        assignedCount: 2,
        unassignedCount: 1,
        capacityWasteAverage: 25.0,
        executionTimeMs: 12,
      },
      timestamp: '2026-10-09T00:00:00Z',
    };

    const heuristicResult: AllocationResult = {
      method: 'HEURISTIC',
      assignments: [
        { bookingId: 'b1', roomId: 'r-optimal-1', explanation: 'Best fit' },
        { bookingId: 'b2', roomId: 'r-optimal-2', explanation: 'Best fit' },
        { bookingId: 'b3', roomId: 'r-optimal-3', explanation: 'Best fit' },
      ],
      unassigned: [],
      metrics: {
        totalRequested: 3,
        assignedCount: 3,
        unassignedCount: 0,
        capacityWasteAverage: 8.0,
        executionTimeMs: 18,
      },
      timestamp: '2026-10-09T00:00:00Z',
    };

    const comparison = metricsService.compareResults(baselineResult, heuristicResult);

    assert.equal(comparison.baselineMethod, 'FIRST_FIT');
    assert.equal(comparison.heuristicMethod, 'HEURISTIC');
    assert.equal(comparison.evaluation.superiorMethod, 'HEURISTIC');
    assert.equal(comparison.deltas.conflictCountDelta, -1);
    assert.ok(comparison.deltas.capacityWasteReduction > 0);
    assert.ok(comparison.evaluation.summary.includes('Improved Heuristic outperformed'));
  });
});
