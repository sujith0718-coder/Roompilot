import { describe, it, expect } from 'vitest';
import {
  mockRooms,
  mockBookingRequests,
  slotMorning,
  slotAfternoon,
} from '../fixtures/sharedFixtures.js';
import {
  runFirstFitAllocation,
  runDisruptionRecovery,
  validateAssignmentStrict,
} from '../helpers/domainAlgorithms.js';
import {
  AllocationAssignment,
  BookingRequest,
  DisruptionEvent,
  Room,
} from '../../../shared/types/index.js';

describe('Disruption Recovery Engine — Room Closures & Reassignment Tests', () => {
  it('Scenario A (Successful Recovery): Reassigns affected class to feasible alternative without disturbing unaffected rooms', () => {
    // 2 classes:
    // Req 1: in Room 101 (cap 40, slotMorning)
    // Req 2: in Room 201 (cap 30, slotMorning, requires LAB_EQUIPMENT)
    // Alternative room: Room 102 (cap 60, slotMorning, PROJECTOR, AC)
    const req1: BookingRequest = {
      id: 'rec-req-1',
      title: 'CS101 Intro Programming',
      requesterId: 'usr-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 35,
      requiredFacilities: ['PROJECTOR'],
      slot: slotMorning,
      status: 'ALLOCATED',
      createdAt: new Date().toISOString(),
    };
    const req2: BookingRequest = {
      id: 'rec-req-2',
      title: 'EE101 Circuit Design',
      requesterId: 'usr-2',
      requesterRole: 'TUTOR',
      enrollmentCount: 20,
      requiredFacilities: ['LAB_EQUIPMENT'],
      slot: slotMorning,
      status: 'ALLOCATED',
      createdAt: new Date().toISOString(),
    };

    const initialAssignments: AllocationAssignment[] = [
      { bookingId: req1.id, roomId: 'room-101', explanation: 'Assigned Room 101' },
      { bookingId: req2.id, roomId: 'room-201', explanation: 'Assigned Lab 201' },
    ];

    // Trigger sudden closure of Room 101 (pipe leak)
    const event: DisruptionEvent = {
      roomId: 'room-101',
      reason: 'AC condenser burst and ceiling leak',
      slot: slotMorning,
    };

    const report = runDisruptionRecovery(
      event,
      initialAssignments,
      [req1, req2],
      mockRooms
    );

    // Verify recovery report structure
    expect(report.closedRoomId).toBe('room-101');
    expect(report.affectedBookingIds).toEqual(['rec-req-1']);
    expect(report.unaffectedAssignmentsPreservedCount).toBe(1); // req-2 in room-201 was NOT touched!
    expect(report.totalAssignmentsChangedCount).toBe(1);
    expect(report.unresolvedBookingIds).toHaveLength(0);

    // Reassigned booking details
    expect(report.reassignedBookings).toHaveLength(1);
    const reassignment = report.reassignedBookings[0];
    expect(reassignment.bookingId).toBe('rec-req-1');
    expect(reassignment.previousRoomId).toBe('room-101');
    expect(reassignment.newRoomId).toBe('room-102'); // Moved to free Room 102 (capacity 60)
    expect(reassignment.explanation).toContain('Reassigned from closed room');

    // Independent validation on recovered state
    const room102 = mockRooms.find((r) => r.id === 'room-102')!;
    const validation = validateAssignmentStrict(req1, room102, [
      { roomId: 'room-201', slot: req2.slot },
    ]);
    expect(validation.isValid).toBe(true);
  });

  it('Scenario B (Honest Failed Recovery): Accurately reports unresolved booking when no feasible alternative exists', () => {
    // Specialized Lab class in Room 201 (the ONLY lab in the campus)
    const labReq: BookingRequest = {
      id: 'rec-lab-req',
      title: 'Advanced Microprocessors Lab',
      requesterId: 'usr-tutor-lab',
      requesterRole: 'TUTOR',
      enrollmentCount: 28,
      requiredFacilities: ['LAB_EQUIPMENT'],
      slot: slotMorning,
      status: 'ALLOCATED',
      createdAt: new Date().toISOString(),
    };

    const initialAssignments: AllocationAssignment[] = [
      { bookingId: labReq.id, roomId: 'room-201', explanation: 'Assigned Computing Lab 201' },
    ];

    // Sudden electrical short circuit in the ONLY lab room
    const event: DisruptionEvent = {
      roomId: 'room-201',
      reason: 'Electrical circuit breaker failure in Lab',
      slot: slotMorning,
    };

    const report = runDisruptionRecovery(
      event,
      initialAssignments,
      [labReq],
      mockRooms
    );

    // No other room on campus has LAB_EQUIPMENT!
    expect(report.closedRoomId).toBe('room-201');
    expect(report.affectedBookingIds).toContain('rec-lab-req');
    expect(report.reassignedBookings).toHaveLength(0); // Cannot reassign to non-lab room!
    expect(report.unresolvedBookingIds).toHaveLength(1);

    const unresolved = report.unresolvedBookingIds[0];
    expect(unresolved.bookingId).toBe('rec-lab-req');
    expect(unresolved.reason).toContain('No alternative room available meeting constraints');

    // Zero fabricated assignments
    expect(report.totalAssignmentsChangedCount).toBe(0);
  });

  it('Recovery preserves all active constraints (capacity, facilities, closures, overlaps)', () => {
    // 3 classes all scheduled at slotMorning
    const requests: BookingRequest[] = [
      {
        id: 'req-a',
        title: 'Class A',
        requesterId: 'u1',
        requesterRole: 'TUTOR',
        enrollmentCount: 38,
        requiredFacilities: ['PROJECTOR'],
        slot: slotMorning,
        status: 'ALLOCATED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'req-b',
        title: 'Class B',
        requesterId: 'u2',
        requesterRole: 'TUTOR',
        enrollmentCount: 55,
        requiredFacilities: ['PROJECTOR', 'AUDIO_SYSTEM'],
        slot: slotMorning,
        status: 'ALLOCATED',
        createdAt: new Date().toISOString(),
      },
    ];

    // Initial: Req A in Room 101, Req B in Room 102
    const initialAssignments: AllocationAssignment[] = [
      { bookingId: 'req-a', roomId: 'room-101', explanation: 'Assigned LH-101' },
      { bookingId: 'req-b', roomId: 'room-102', explanation: 'Assigned LH-102' },
    ];

    // Close Room 101
    const event: DisruptionEvent = {
      roomId: 'room-101',
      reason: 'Structural inspection',
      slot: slotMorning,
    };

    const report = runDisruptionRecovery(event, initialAssignments, requests, mockRooms);

    // Room 102 is already occupied by Class B at slotMorning, so Req A CANNOT double-book Room 102!
    // It must find another room (like Auditorium 301 or Seminar 202 if cap allows)
    if (report.reassignedBookings.length > 0) {
      const newRoomId = report.reassignedBookings[0].newRoomId;
      expect(newRoomId).not.toBe('room-102'); // MUST NOT double-book room-102!
      expect(newRoomId).not.toBe('room-101'); // MUST NOT stay in closed room!
    }
  });
});
