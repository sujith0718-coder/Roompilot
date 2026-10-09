import {
  BookingRequest,
  HardConstraintValidationResult,
  ConstraintViolationDetail,
  Room,
  AllocationAssignment,
  RoomClosure,
  TimeSlot,
} from '../../../../shared/types/index.js';

/**
 * Service Boundary: Independent Hard-Constraint Validator
 * Completely decoupled from allocation algorithms and heuristics.
 * Evaluates the concrete candidate assignments against rooms, class occurrences, and closures.
 */
export interface IValidationService {
  validateAssignment(
    request: BookingRequest,
    room: Room,
    existingAssignments: { roomId: string; slot: BookingRequest['slot']; bookingId?: string }[],
    closures?: RoomClosure[]
  ): HardConstraintValidationResult;

  validateAllocation(
    assignments: AllocationAssignment[],
    requests: BookingRequest[],
    rooms: Room[],
    closures?: RoomClosure[]
  ): HardConstraintValidationResult;
}

/**
 * Determines whether two time slots conflict with each other.
 */
export function doSlotsOverlap(slotA: TimeSlot, slotB: TimeSlot): boolean {
  // If specific dates are provided and differ, they do not overlap
  if (slotA.date && slotB.date && slotA.date !== slotB.date) {
    return false;
  }

  // If no differing dates, they must be on the same day of the week to overlap
  if (slotA.dayOfWeek !== slotB.dayOfWeek) {
    return false;
  }

  // Overlap condition: startA < endB && startB < endA
  return slotA.startTime < slotB.endTime && slotB.startTime < slotA.endTime;
}

export class ValidationService implements IValidationService {
  /**
   * Validates a single proposed assignment against hard constraints.
   */
  public validateAssignment(
    request: BookingRequest,
    room: Room,
    existingAssignments: { roomId: string; slot: BookingRequest['slot']; bookingId?: string }[] = [],
    closures: RoomClosure[] = []
  ): HardConstraintValidationResult {
    const violations: string[] = [];
    const details: ConstraintViolationDetail[] = [];

    const roomIdStr = String(room.id || room.code);
    const bookingIdStr = String(request.id);

    // 1. Room availability & blocked status
    if (room.isBlocked) {
      const reason = `Room ${room.code} is closed or blocked (${room.blockReason || 'No reason provided'}).`;
      violations.push(reason);
      details.push({
        bookingId: bookingIdStr,
        roomId: roomIdStr,
        reason,
        constraintType: 'ROOM_CLOSED',
      });
    }

    // 2. Active room closures
    const matchingClosures = closures.filter(
      (c) =>
        c.status === 'ACTIVE' &&
        String(c.roomId) === roomIdStr &&
        (!c.slot || doSlotsOverlap(request.slot, c.slot))
    );
    for (const closure of matchingClosures) {
      const reason = `Room ${room.code} is closed due to active disruption: ${closure.reason}.`;
      violations.push(reason);
      details.push({
        bookingId: bookingIdStr,
        roomId: roomIdStr,
        reason,
        constraintType: 'ROOM_CLOSED',
      });
    }

    // 3. Room capacity vs enrollment
    if (room.capacity < request.enrollmentCount) {
      const reason = `Room ${room.code} capacity (${room.capacity}) is smaller than enrollment count (${request.enrollmentCount}).`;
      violations.push(reason);
      details.push({
        bookingId: bookingIdStr,
        roomId: roomIdStr,
        reason,
        constraintType: 'CAPACITY',
      });
    }

    // 4. Required facilities
    const missingFacilities = (request.requiredFacilities || []).filter(
      (facility) => !room.facilities.includes(facility)
    );
    if (missingFacilities.length > 0) {
      const reason = `Room ${room.code} lacks required facilities: ${missingFacilities.join(', ')}.`;
      violations.push(reason);
      details.push({
        bookingId: bookingIdStr,
        roomId: roomIdStr,
        reason,
        constraintType: 'FACILITY',
      });
    }

    // 5. Overlapping room bookings
    for (const existing of existingAssignments) {
      if (String(existing.roomId) === roomIdStr && doSlotsOverlap(request.slot, existing.slot)) {
        const reason = `Room ${room.code} already has an overlapping booking for slot ${request.slot.dayOfWeek} ${request.slot.startTime}-${request.slot.endTime}.`;
        violations.push(reason);
        details.push({
          bookingId: bookingIdStr,
          roomId: roomIdStr,
          reason,
          constraintType: 'OVERLAP',
        });
        break; // One overlap violation per room collision is sufficient
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      details,
    };
  }

  /**
   * Evaluates an entire set of candidate assignments independently.
   * Checks for:
   * - Missing booking/class occurrences
   * - Missing rooms
   * - Duplicate assignments for one class occurrence
   * - Room capacity vs enrollment
   * - Required facilities
   * - Room availability and closures
   * - Overlapping room bookings
   */
  public validateAllocation(
    assignments: AllocationAssignment[],
    requests: BookingRequest[],
    rooms: Room[],
    closures: RoomClosure[] = []
  ): HardConstraintValidationResult {
    const violations: string[] = [];
    const details: ConstraintViolationDetail[] = [];

    // Map lookup for O(1) checks
    const requestMap = new Map<string, BookingRequest>();
    for (const req of requests) {
      requestMap.set(String(req.id), req);
    }

    const roomMap = new Map<string, Room>();
    for (const r of rooms) {
      roomMap.set(String(r.id), r);
      if (r.code) {
        roomMap.set(r.code, r);
      }
    }

    // Tracking for duplicate booking assignments
    const assignedBookingIds = new Set<string>();

    // Tracking for room schedules: roomId -> array of { bookingId, slot }
    const roomSchedules = new Map<string, { bookingId: string; title: string; slot: TimeSlot }[]>();

    for (const assignment of assignments) {
      const bookingId = String(assignment.bookingId);
      const roomId = String(assignment.roomId);

      // 1. Missing booking reference
      const request = requestMap.get(bookingId);
      if (!request) {
        const reason = `Class occurrence / booking ID '${bookingId}' does not exist in request dataset.`;
        violations.push(reason);
        details.push({
          bookingId,
          roomId,
          reason,
          constraintType: 'MISSING_BOOKING',
        });
        continue; // Cannot validate further attributes without booking entity
      }

      // 2. Missing room reference
      const room = roomMap.get(roomId);
      if (!room) {
        const reason = `Room ID '${roomId}' assigned to '${request.title}' does not exist in room dataset.`;
        violations.push(reason);
        details.push({
          bookingId,
          roomId,
          reason,
          constraintType: 'MISSING_ROOM',
        });
        continue; // Cannot validate room constraints without room entity
      }

      // 3. Duplicate assignment for one class occurrence
      if (assignedBookingIds.has(bookingId)) {
        const reason = `Class occurrence '${request.title}' (${bookingId}) is assigned more than once (duplicate assignment).`;
        violations.push(reason);
        details.push({
          bookingId,
          roomId: String(room.id || room.code),
          reason,
          constraintType: 'DUPLICATE_ASSIGNMENT',
        });
      } else {
        assignedBookingIds.add(bookingId);
      }

      const canonicalRoomId = String(room.id || room.code);

      // 4. Room availability and blocked state
      if (room.isBlocked) {
        const reason = `Room '${room.code}' is closed or blocked (${room.blockReason || 'No reason provided'}). Cannot host '${request.title}'.`;
        violations.push(reason);
        details.push({
          bookingId,
          roomId: canonicalRoomId,
          reason,
          constraintType: 'ROOM_CLOSED',
        });
      }

      // 5. Active room closure records
      const matchingClosures = closures.filter(
        (c) =>
          c.status === 'ACTIVE' &&
          (String(c.roomId) === canonicalRoomId || String(c.roomId) === room.code) &&
          (!c.slot || doSlotsOverlap(request.slot, c.slot))
      );
      for (const closure of matchingClosures) {
        const reason = `Room '${room.code}' has an active closure (${closure.reason}). Cannot host '${request.title}'.`;
        violations.push(reason);
        details.push({
          bookingId,
          roomId: canonicalRoomId,
          reason,
          constraintType: 'ROOM_CLOSED',
        });
      }

      // 6. Room capacity vs enrollment
      if (room.capacity < request.enrollmentCount) {
        const reason = `Room '${room.code}' capacity (${room.capacity}) is insufficient for enrollment (${request.enrollmentCount}) of '${request.title}'.`;
        violations.push(reason);
        details.push({
          bookingId,
          roomId: canonicalRoomId,
          reason,
          constraintType: 'CAPACITY',
        });
      }

      // 7. Required facilities
      const missingFacilities = (request.requiredFacilities || []).filter(
        (facility) => !room.facilities.includes(facility)
      );
      if (missingFacilities.length > 0) {
        const reason = `Room '${room.code}' lacks required facilities: ${missingFacilities.join(', ')} for '${request.title}'.`;
        violations.push(reason);
        details.push({
          bookingId,
          roomId: canonicalRoomId,
          reason,
          constraintType: 'FACILITY',
        });
      }

      // 8. Overlapping room bookings
      const schedule = roomSchedules.get(canonicalRoomId) || [];
      for (const existing of schedule) {
        if (doSlotsOverlap(request.slot, existing.slot)) {
          const reason = `Overlapping booking in room '${room.code}': '${request.title}' (${request.slot.startTime}-${request.slot.endTime}) conflicts with '${existing.title}' (${existing.slot.startTime}-${existing.slot.endTime}) on ${request.slot.dayOfWeek}.`;
          violations.push(reason);
          details.push({
            bookingId,
            roomId: canonicalRoomId,
            reason,
            constraintType: 'OVERLAP',
          });
        }
      }

      schedule.push({
        bookingId,
        title: request.title,
        slot: request.slot,
      });
      roomSchedules.set(canonicalRoomId, schedule);
    }

    return {
      isValid: violations.length === 0,
      violations,
      details,
    };
  }
}

export const validationService = new ValidationService();
