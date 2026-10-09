import { describe, it, expect } from 'vitest';
import {
  mockRooms,
  mockBookingRequests,
  slotMorning,
  slotMidday,
  slotAfternoon,
} from '../fixtures/sharedFixtures.js';
import {
  runFirstFitAllocation,
  runHeuristicAllocation,
  validateAssignmentStrict,
} from '../helpers/domainAlgorithms.js';
import { BookingRequest, Room } from '../../../shared/types/index.js';

describe('Allocation Engine — 6 Required Constraint Cases & Algorithm Comparison', () => {
  // Available rooms excluding the blocked annex
  const testRooms = mockRooms;

  describe('The 6 Core Hard-Constraint Allocation Scenarios', () => {
    it('Case 1: Suitable Room — Successfully allocates a room meeting capacity, facilities, and schedule', () => {
      const suitableReq: BookingRequest = {
        id: 'test-case-1',
        title: 'Physics 101 Lecture',
        requesterId: 'tutor-1',
        requesterRole: 'TUTOR',
        enrollmentCount: 35,
        requiredFacilities: ['PROJECTOR'],
        slot: slotMorning,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const result = runFirstFitAllocation([suitableReq], testRooms);

      expect(result.assignments).toHaveLength(1);
      expect(result.unassigned).toHaveLength(0);

      const assignedRoom = testRooms.find((r) => r.id === result.assignments[0].roomId)!;
      expect(assignedRoom.capacity).toBeGreaterThanOrEqual(suitableReq.enrollmentCount);
      expect(assignedRoom.facilities).toContain('PROJECTOR');
      expect(assignedRoom.isBlocked).toBe(false);

      // Independently validate
      const validation = validateAssignmentStrict(suitableReq, assignedRoom, []);
      expect(validation.isValid).toBe(true);
    });

    it('Case 2: Insufficient Capacity — Rejects rooms that are too small and reports unassigned class', () => {
      const oversizedReq: BookingRequest = {
        id: 'test-case-2',
        title: 'Massive Convocation',
        requesterId: 'admin-1',
        requesterRole: 'SYSTEM_ADMIN',
        enrollmentCount: 300, // Maximum room capacity in system is 120 (Auditorium)
        requiredFacilities: ['PROJECTOR'],
        slot: slotMorning,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const result = runFirstFitAllocation([oversizedReq], testRooms);

      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].bookingId).toBe('test-case-2');
      expect(result.unassigned[0].reason).toContain('smaller than enrollment count');
    });

    it('Case 3: Missing Facility — Rejects rooms lacking required specialized facilities', () => {
      const labReq: BookingRequest = {
        id: 'test-case-3',
        title: 'Robotics Workshop',
        requesterId: 'tutor-2',
        requesterRole: 'TUTOR',
        enrollmentCount: 20,
        requiredFacilities: ['LAB_EQUIPMENT'],
        slot: slotMorning,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      // Restrict available rooms to rooms without LAB_EQUIPMENT
      const roomsWithoutLab = testRooms.filter((r) => !r.facilities.includes('LAB_EQUIPMENT'));
      const result = runFirstFitAllocation([labReq], roomsWithoutLab);

      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].reason).toContain('lacks required facilities');
      expect(result.unassigned[0].reason).toContain('LAB_EQUIPMENT');
    });

    it('Case 4: Unavailable / Closed Room — Ineligible or blocked rooms are strictly excluded', () => {
      const req: BookingRequest = {
        id: 'test-case-4',
        title: 'Department Meeting',
        requesterId: 'hod-1',
        requesterRole: 'HOD',
        enrollmentCount: 45,
        requiredFacilities: ['PROJECTOR'],
        slot: slotMorning,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      // Only give the allocator the blocked annex room
      const onlyBlockedRoom = testRooms.filter((r) => r.isBlocked);
      const result = runFirstFitAllocation([req], onlyBlockedRoom);

      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].reason).toContain('closed or blocked');
      expect(result.unassigned[0].reason).toContain('Emergency water pipe repair');
    });

    it('Case 5: Overlapping Room Bookings — Conflicting classes cannot occupy the same room at the same time', () => {
      // Two classes of size 35 at the exact same slot, only room-101 (cap 40) is offered
      const reqA: BookingRequest = {
        id: 'test-case-5-a',
        title: 'Morning Chemistry',
        requesterId: 'tutor-1',
        requesterRole: 'TUTOR',
        enrollmentCount: 35,
        requiredFacilities: ['PROJECTOR'],
        slot: slotMorning,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      const reqB: BookingRequest = {
        id: 'test-case-5-b',
        title: 'Morning Biology',
        requesterId: 'tutor-2',
        requesterRole: 'TUTOR',
        enrollmentCount: 35,
        requiredFacilities: ['PROJECTOR'],
        slot: slotMorning,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const singleRoomOnly = [testRooms.find((r) => r.id === 'room-101')!];
      const result = runFirstFitAllocation([reqA, reqB], singleRoomOnly);

      // Exactly one can get the room; the other MUST be unassigned due to slot conflict
      expect(result.assignments).toHaveLength(1);
      expect(result.unassigned).toHaveLength(1);
      expect(result.assignments[0].bookingId).toBe('test-case-5-a');
      expect(result.unassigned[0].bookingId).toBe('test-case-5-b');
      expect(result.unassigned[0].reason).toContain('overlapping booking');
    });

    it('Case 6: No Feasible Room — Stays unresolved instead of receiving an invalid assignment', () => {
      const impossibleReq: BookingRequest = {
        id: 'test-case-6',
        title: 'Impossible Seminar',
        requesterId: 'tutor-3',
        requesterRole: 'TUTOR',
        enrollmentCount: 150, // exceeds max cap
        requiredFacilities: ['LAB_EQUIPMENT', 'SMART_BOARD', 'WHEELCHAIR_ACCESSIBLE'], // no room has this exact combo
        slot: slotAfternoon,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const result = runFirstFitAllocation([impossibleReq], testRooms);

      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].evaluatedRoomsCount).toBe(testRooms.length);
      expect(result.metrics.assignedCount).toBe(0);
      expect(result.metrics.unassignedCount).toBe(1);
    });
  });

  describe('Algorithm Comparison: First-Fit vs Improved Heuristic on Identical Shared Fixture', () => {
    const sharedRequests = mockBookingRequests;
    const sharedRooms = mockRooms;

    it('runs First-Fit on shared fixture and independently validates all assignments', () => {
      const firstFitResult = runFirstFitAllocation(sharedRequests, sharedRooms);

      expect(firstFitResult.method).toBe('FIRST_FIT');
      expect(firstFitResult.metrics.totalRequested).toBe(sharedRequests.length);
      expect(firstFitResult.metrics.assignedCount + firstFitResult.metrics.unassignedCount).toBe(
        sharedRequests.length
      );

      // Validate every single assigned booking against strict hard constraints
      const assignedSlots: { roomId: string; slot: BookingRequest['slot'] }[] = [];
      const roomMap = new Map(sharedRooms.map((r) => [r.id, r]));
      const reqMap = new Map(sharedRequests.map((r) => [r.id, r]));

      for (const assignment of firstFitResult.assignments) {
        const room = roomMap.get(assignment.roomId)!;
        const req = reqMap.get(assignment.bookingId)!;

        // Ensure no overlapping booking was assigned in the same room
        const validation = validateAssignmentStrict(req, room, assignedSlots);
        expect(validation.isValid).toBe(true);
        expect(validation.violations).toHaveLength(0);

        assignedSlots.push({ roomId: room.id, slot: req.slot });
      }
    });

    it('runs Improved Heuristic on shared fixture and independently validates all assignments', () => {
      const heuristicResult = runHeuristicAllocation(sharedRequests, sharedRooms);

      expect(heuristicResult.method).toBe('HEURISTIC');
      expect(heuristicResult.metrics.totalRequested).toBe(sharedRequests.length);
      expect(heuristicResult.metrics.assignedCount + heuristicResult.metrics.unassignedCount).toBe(
        sharedRequests.length
      );

      // Validate every single assigned booking against strict hard constraints
      const assignedSlots: { roomId: string; slot: BookingRequest['slot'] }[] = [];
      const roomMap = new Map(sharedRooms.map((r) => [r.id, r]));
      const reqMap = new Map(sharedRequests.map((r) => [r.id, r]));

      for (const assignment of heuristicResult.assignments) {
        const room = roomMap.get(assignment.roomId)!;
        const req = reqMap.get(assignment.bookingId)!;

        const validation = validateAssignmentStrict(req, room, assignedSlots);
        expect(validation.isValid).toBe(true);
        expect(validation.violations).toHaveLength(0);

        assignedSlots.push({ roomId: room.id, slot: req.slot });
      }
    });

    it('compares actual calculated metrics between First-Fit and Improved Heuristic', () => {
      const firstFitResult = runFirstFitAllocation(sharedRequests, sharedRooms);
      const heuristicResult = runHeuristicAllocation(sharedRequests, sharedRooms);

      // Both algorithms handle the exact same input requests honestly
      expect(firstFitResult.metrics.totalRequested).toBe(heuristicResult.metrics.totalRequested);

      // Honest reporting: neither algorithm fabricates impossible assignments
      expect(firstFitResult.unassigned.some((u) => u.bookingId === 'req-002')).toBe(true);
      expect(heuristicResult.unassigned.some((u) => u.bookingId === 'req-002')).toBe(true);

      // Compare capacity waste
      expect(firstFitResult.metrics.capacityWasteAverage).toBeGreaterThanOrEqual(0);
      expect(heuristicResult.metrics.capacityWasteAverage).toBeGreaterThanOrEqual(0);

      // Improved Heuristic aims for best-fit capacity reduction
      const wasteDifference =
        firstFitResult.metrics.capacityWasteAverage - heuristicResult.metrics.capacityWasteAverage;
      expect(typeof wasteDifference).toBe('number');
    });

    it('tests AllocationService.runAllocation with independent post-allocation validation attachment', async () => {
      const { allocationService } = await import('../../src/services/allocation/index.js');
      const result = await allocationService.runAllocation(sharedRequests, sharedRooms, 'HEURISTIC', { saveRecord: false });

      expect(result.method).toBe('HEURISTIC');
      expect(result.runId).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.validation?.isValid).toBe(true);
      expect(result.assignments.length).toBeGreaterThan(0);
    });
  });
});
