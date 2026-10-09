import { describe, it, expect, vi } from 'vitest';
import {
  mockRooms,
  mockBookingRequests,
  slotMorning,
  slotAfternoon,
} from '../fixtures/sharedFixtures.js';
import {
  AllocationAssignment,
  BookingRequest,
  DisruptionEvent,
  Room,
  TimeSlot,
} from '../../../shared/types/index.js';
import { recoveryService } from '../../src/services/recovery/index.js';
import { doSlotsOverlap, validationService } from '../../src/services/validation/index.js';

describe('Disruption Recovery Engine — Comprehensive Unit Suite', () => {
  it('Scenario 1: Allocated bookings with status ALLOCATED are recovered and preserve their status', async () => {
    const allocatedReq: BookingRequest = {
      id: 'req-allocated-1',
      title: 'Operating Systems Lecture',
      requesterId: 'tutor-1',
      requesterRole: 'TUTOR',
      enrollmentCount: 30,
      requiredFacilities: ['PROJECTOR'],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: 'room-101',
      createdAt: new Date().toISOString(),
    };

    const report = await recoveryService.handleRoomClosure(
      {
        roomId: 'room-101',
        reason: 'Blackout',
        slot: slotMorning,
      },
      {
        requests: [allocatedReq],
        rooms: mockRooms,
        currentAssignments: [{ bookingId: 'req-allocated-1', roomId: 'room-101', explanation: 'Assigned' }],
      }
    );

    expect(report.closedRoomId).toBe('room-101');
    expect(report.reassignedBookings).toHaveLength(1);
    expect(report.reassignedBookings[0].bookingId).toBe('req-allocated-1');
  });

  it('Scenario 2: Slot-specific closure leaves bookings outside disruption window unchanged', async () => {
    const morningReq: BookingRequest = {
      id: 'req-morning',
      title: 'Morning CS Class',
      requesterId: 'u1',
      requesterRole: 'TUTOR',
      enrollmentCount: 25,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: 'room-101',
      createdAt: new Date().toISOString(),
    };

    const afternoonReq: BookingRequest = {
      id: 'req-afternoon',
      title: 'Afternoon CS Class',
      requesterId: 'u2',
      requesterRole: 'TUTOR',
      enrollmentCount: 25,
      requiredFacilities: [],
      slot: slotAfternoon,
      status: 'ALLOCATED',
      assignedRoomId: 'room-101',
      createdAt: new Date().toISOString(),
    };

    const report = await recoveryService.handleRoomClosure(
      {
        roomId: 'room-101',
        reason: 'Morning roof repair',
        slot: slotMorning,
      },
      {
        requests: [morningReq, afternoonReq],
        rooms: mockRooms,
        currentAssignments: [
          { bookingId: 'req-morning', roomId: 'room-101', explanation: 'Morning' },
          { bookingId: 'req-afternoon', roomId: 'room-101', explanation: 'Afternoon' },
        ],
      }
    );

    expect(report.affectedBookingIds).toContain('req-morning');
    expect(report.affectedBookingIds).not.toContain('req-afternoon');
    expect(report.unaffectedAssignmentsPreservedCount).toBe(1);
  });

  it('Scenario 3: Full-room closure (without slot) affects all bookings in that room', async () => {
    const req1: BookingRequest = {
      id: 'req-f1',
      title: 'Class 1',
      requesterId: 'u1',
      requesterRole: 'TUTOR',
      enrollmentCount: 20,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: 'room-101',
      createdAt: new Date().toISOString(),
    };

    const req2: BookingRequest = {
      id: 'req-f2',
      title: 'Class 2',
      requesterId: 'u2',
      requesterRole: 'TUTOR',
      enrollmentCount: 20,
      requiredFacilities: [],
      slot: slotAfternoon,
      status: 'ALLOCATED',
      assignedRoomId: 'room-101',
      createdAt: new Date().toISOString(),
    };

    const report = await recoveryService.handleRoomClosure(
      {
        roomId: 'room-101',
        reason: 'Full building renovation',
      },
      {
        requests: [req1, req2],
        rooms: mockRooms,
        currentAssignments: [
          { bookingId: 'req-f1', roomId: 'room-101', explanation: 'C1' },
          { bookingId: 'req-f2', roomId: 'room-101', explanation: 'C2' },
        ],
      }
    );

    expect(report.affectedBookingIds).toHaveLength(2);
    expect(report.unaffectedAssignmentsPreservedCount).toBe(0);
  });

  it('Scenario 4: Boundary adjacency — a booking ending at 10:00 and starting at 10:00 do NOT conflict', () => {
    const slotA: TimeSlot = { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' };
    const slotB: TimeSlot = { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '11:00' };

    expect(doSlotsOverlap(slotA, slotB)).toBe(false);
  });

  it('Scenario 5: Real overlap — slots 09:00-10:30 and 10:00-11:30 DO conflict', () => {
    const slotA: TimeSlot = { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:30' };
    const slotB: TimeSlot = { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '11:30' };

    expect(doSlotsOverlap(slotA, slotB)).toBe(true);
  });

  it('Scenario 6: No feasible room — reports unresolved with reason and zero invalid reassignments', async () => {
    const hugeLabReq: BookingRequest = {
      id: 'req-huge-lab',
      title: 'Mega Robotics Lab',
      requesterId: 'u1',
      requesterRole: 'TUTOR',
      enrollmentCount: 500,
      requiredFacilities: ['LAB_EQUIPMENT'],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: 'room-201',
      createdAt: new Date().toISOString(),
    };

    const report = await recoveryService.handleRoomClosure(
      {
        roomId: 'room-201',
        reason: 'Lab explosion',
      },
      {
        requests: [hugeLabReq],
        rooms: mockRooms,
        currentAssignments: [{ bookingId: 'req-huge-lab', roomId: 'room-201', explanation: 'Assigned' }],
      }
    );

    expect(report.reassignedBookings).toHaveLength(0);
    expect(report.unresolvedBookingIds).toHaveLength(1);
    expect(report.unresolvedBookingIds[0].bookingId).toBe('req-huge-lab');
    expect(report.unresolvedBookingIds[0].reason).toContain('No alternative room meeting constraints');
  });

  it('Scenario 7: Validation failure — rejects invalid candidate before committing changes', async () => {
    const spy = vi.spyOn(validationService, 'validateAllocation').mockReturnValueOnce({
      isValid: false,
      violations: ['Simulated validation constraint violation'],
    });

    const req: BookingRequest = {
      id: 'req-v1',
      title: 'Test Class',
      requesterId: 'u1',
      requesterRole: 'TUTOR',
      enrollmentCount: 20,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: 'room-101',
      createdAt: new Date().toISOString(),
    };

    await expect(
      recoveryService.handleRoomClosure(
        { roomId: 'room-101', reason: 'Test validation failure' },
        {
          requests: [req],
          rooms: mockRooms,
          currentAssignments: [{ bookingId: 'req-v1', roomId: 'room-101', explanation: 'Assigned' }],
        }
      )
    ).rejects.toThrow('Recovery candidate allocation failed independent validation');

    spy.mockRestore();
  });

  it('Scenario 16: Unaffected assignment preservation — bookings in unaffected rooms remain unchanged', async () => {
    const reqIn101: BookingRequest = {
      id: 'req-in-101',
      title: 'Class in 101',
      requesterId: 'u1',
      requesterRole: 'TUTOR',
      enrollmentCount: 20,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: 'room-101',
      createdAt: new Date().toISOString(),
    };

    const reqIn201: BookingRequest = {
      id: 'req-in-201',
      title: 'Class in 201',
      requesterId: 'u2',
      requesterRole: 'TUTOR',
      enrollmentCount: 20,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: 'room-201',
      createdAt: new Date().toISOString(),
    };

    const report = await recoveryService.handleRoomClosure(
      {
        roomId: 'room-101',
        reason: 'Water leak',
      },
      {
        requests: [reqIn101, reqIn201],
        rooms: mockRooms,
        currentAssignments: [
          { bookingId: 'req-in-101', roomId: 'room-101', explanation: 'In 101' },
          { bookingId: 'req-in-201', roomId: 'room-201', explanation: 'In 201' },
        ],
      }
    );

    expect(report.closedRoomId).toBe('room-101');
    expect(report.unaffectedAssignmentsPreservedCount).toBe(1);
    expect(report.affectedBookingIds).toContain('req-in-101');
    expect(report.affectedBookingIds).not.toContain('req-in-201');
  });
});
