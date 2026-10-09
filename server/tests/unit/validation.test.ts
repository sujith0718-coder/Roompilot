import { describe, it, expect } from 'vitest';
import { validationService } from '../../src/services/validation/index.js';
import { mockRooms, mockBookingRequests, slotMorning, slotMidday } from '../fixtures/sharedFixtures.js';
import { validateAssignmentStrict, isSlotOverlapping } from '../helpers/domainAlgorithms.js';
import { BookingRequest, Room } from '../../../shared/types/index.js';

describe('Validation Service — Hard-Constraint Validator Tests', () => {
  const room101 = mockRooms.find((r) => r.id === 'room-101')!; // cap: 40, facilities: PROJECTOR, AC
  const roomLab = mockRooms.find((r) => r.id === 'room-201')!; // cap: 30, facilities: LAB_EQUIPMENT, AC, PROJECTOR
  const blockedRoom = mockRooms.find((r) => r.id === 'room-999')!; // cap: 50, isBlocked: true

  describe('Existing ValidationService (server/src/services/validation)', () => {
    it('approves a valid room that satisfies capacity, facilities, and is not blocked', () => {
      const validRequest: BookingRequest = {
        ...mockBookingRequests[0], // req-001: 35 students, PROJECTOR
      };

      const result = validationService.validateAssignment(validRequest, room101, []);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('rejects an assignment if the room capacity is smaller than enrollment count', () => {
      const largeRequest: BookingRequest = {
        ...mockBookingRequests[0],
        enrollmentCount: 50, // exceeds room-101 capacity of 40
      };

      const result = validationService.validateAssignment(largeRequest, room101, []);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.includes('smaller than enrollment count'))).toBe(true);
    });

    it('rejects an assignment if the room lacks a required facility', () => {
      const labRequest: BookingRequest = {
        ...mockBookingRequests[0],
        requiredFacilities: ['LAB_EQUIPMENT'], // room-101 lacks LAB_EQUIPMENT
      };

      const result = validationService.validateAssignment(labRequest, room101, []);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.includes('lacks required facilities'))).toBe(true);
      expect(result.violations.some((v) => v.includes('LAB_EQUIPMENT'))).toBe(true);
    });

    it('rejects an assignment if the room is closed or blocked', () => {
      const req: BookingRequest = {
        ...mockBookingRequests[0],
        enrollmentCount: 30, // within room-999 capacity of 50
        requiredFacilities: ['PROJECTOR'], // room-999 has PROJECTOR
      };

      const result = validationService.validateAssignment(req, blockedRoom, []);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.includes('closed or blocked'))).toBe(true);
      expect(result.violations.some((v) => v.includes('Emergency water pipe repair'))).toBe(true);
    });

    it('accumulates multiple simultaneous constraint violations', () => {
      const difficultRequest: BookingRequest = {
        ...mockBookingRequests[0],
        enrollmentCount: 90, // exceeds room-999 cap (50)
        requiredFacilities: ['LAB_EQUIPMENT', 'SMART_BOARD'], // room-999 lacks both
      };

      const result = validationService.validateAssignment(difficultRequest, blockedRoom, []);
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
      expect(result.violations.some((v) => v.includes('closed or blocked'))).toBe(true);
      expect(result.violations.some((v) => v.includes('smaller than enrollment count'))).toBe(true);
      expect(result.violations.some((v) => v.includes('lacks required facilities'))).toBe(true);
    });

    it('documents that Phase 1 ValidationService currently leaves _existingAssignments unused', () => {
      // In Phase 1 foundation, _existingAssignments is prefixed with underscore.
      // We verify that calling it does not throw an exception, but note the slot overlap limitation.
      const req = mockBookingRequests[0];
      const existingAssignments = [{ roomId: room101.id, slot: req.slot }];

      const result = validationService.validateAssignment(req, room101, existingAssignments);
      // Because _existingAssignments is unused in Phase 1, it passes static checks here
      expect(result).toBeDefined();
    });
  });

  describe('Strict Independent Hard-Constraint Validator (Overlap & Complete Rule Enforcement)', () => {
    it('detects and rejects overlapping room bookings for the same room and time slot', () => {
      const req1 = mockBookingRequests[0]; // Monday 09:00-10:00
      const req2: BookingRequest = {
        ...mockBookingRequests[3], // Monday 09:00-10:00
        enrollmentCount: 30,
        requiredFacilities: ['PROJECTOR'],
      };

      const existing = [{ roomId: room101.id, slot: req1.slot }];

      const result = validateAssignmentStrict(req2, room101, existing);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.includes('overlapping booking'))).toBe(true);
    });

    it('permits booking the same room at non-overlapping time slots', () => {
      const reqMorning = { ...mockBookingRequests[0], slot: slotMorning };
      const reqMidday = { ...mockBookingRequests[0], slot: slotMidday };

      const existing = [{ roomId: room101.id, slot: reqMorning.slot }];

      const result = validateAssignmentStrict(reqMidday, room101, existing);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('permits overlapping time slots in different rooms', () => {
      const req1 = mockBookingRequests[0];
      const req2 = { ...mockBookingRequests[0], id: 'req-002-alt' };

      // Room 101 is booked, but we are assigning Room 102
      const existing = [{ roomId: room101.id, slot: req1.slot }];
      const room102 = mockRooms.find((r) => r.id === 'room-102')!;

      const result = validateAssignmentStrict(req2, room102, existing);
      expect(result.isValid).toBe(true);
    });

    it('independent validator rejects fabricated/tampered assignments', () => {
      // Intentionally craft an invalid assignment to ensure validator catches it independently
      const invalidClass: BookingRequest = {
        ...mockBookingRequests[0],
        enrollmentCount: 50,
      };
      const smallRoom: Room = {
        ...room101,
        capacity: 25,
      };

      const validation = validateAssignmentStrict(invalidClass, smallRoom, []);
      expect(validation.isValid).toBe(false);
      expect(validation.violations.some((v) => v.includes('smaller than enrollment count'))).toBe(true);
    });
  });

  describe('Slot Overlap Logic (isSlotOverlapping)', () => {
    it('identifies identical time intervals as overlapping', () => {
      expect(isSlotOverlapping(slotMorning, slotMorning)).toBe(true);
    });

    it('identifies partial overlaps', () => {
      const slotOverlap = {
        dayOfWeek: 'MONDAY' as const,
        startTime: '09:30',
        endTime: '10:30',
      };
      expect(isSlotOverlapping(slotMorning, slotOverlap)).toBe(true);
    });

    it('identifies adjacent non-overlapping slots as non-overlapping', () => {
      const slotAdjacent = {
        dayOfWeek: 'MONDAY' as const,
        startTime: '10:00',
        endTime: '11:00',
      };
      expect(isSlotOverlapping(slotMorning, slotAdjacent)).toBe(false);
    });

    it('identifies different days as non-overlapping even with identical times', () => {
      const slotTuesday = {
        ...slotMorning,
        dayOfWeek: 'TUESDAY' as const,
      };
      expect(isSlotOverlapping(slotMorning, slotTuesday)).toBe(false);
    });
  });
});
