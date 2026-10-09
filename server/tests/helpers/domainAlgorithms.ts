import {
  AllocationAssignment,
  AllocationMethod,
  AllocationResult,
  BookingRequest,
  DisruptionEvent,
  HardConstraintValidationResult,
  RecoveryReport,
  Room,
  TimeSlot,
  UnassignedBookingDetail,
} from '../../../shared/types/index.js';

/**
 * PURE DOMAIN IMPLEMENTATION OF HARD CONSTRAINTS, ALGORITHMS & RECOVERY
 * Implements standard domain logic as defined in docs/ARCHITECTURE.md.
 * Used to independently verify algorithms, compare heuristics, and test recovery.
 */

/**
 * Checks if two time slots overlap on the same day/date.
 */
export function isSlotOverlapping(slotA: TimeSlot, slotB: TimeSlot): boolean {
  if (slotA.dayOfWeek !== slotB.dayOfWeek) {
    return false;
  }
  if (slotA.date && slotB.date && slotA.date !== slotB.date) {
    return false;
  }

  // Convert "HH:mm" to minutes from midnight
  const toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const startA = toMinutes(slotA.startTime);
  const endA = toMinutes(slotA.endTime);
  const startB = toMinutes(slotB.startTime);
  const endB = toMinutes(slotB.endTime);

  // Overlap condition: startA < endB && startB < endA
  return startA < endB && startB < endA;
}

/**
 * Complete Independent Hard-Constraint Validator
 */
export function validateAssignmentStrict(
  request: BookingRequest,
  room: Room,
  existingAssignments: { roomId: string; slot: TimeSlot }[]
): HardConstraintValidationResult {
  const violations: string[] = [];

  // 1. Room blockage / closure check
  if (room.isBlocked) {
    violations.push(`Room ${room.code} is closed or blocked (${room.blockReason || 'No reason specified'}).`);
  }

  // 2. Capacity check
  if (room.capacity < request.enrollmentCount) {
    violations.push(
      `Room capacity (${room.capacity}) is smaller than enrollment count (${request.enrollmentCount}).`
    );
  }

  // 3. Required facilities check
  const missingFacilities = request.requiredFacilities.filter(
    (facility) => !room.facilities.includes(facility)
  );
  if (missingFacilities.length > 0) {
    violations.push(`Room lacks required facilities: ${missingFacilities.join(', ')}.`);
  }

  // 4. Overlapping booking check
  const hasOverlap = existingAssignments.some((assignment) => {
    return assignment.roomId === room.id && isSlotOverlapping(assignment.slot, request.slot);
  });
  if (hasOverlap) {
    violations.push(`Room ${room.code} already has an overlapping booking for slot ${request.slot.startTime}-${request.slot.endTime}.`);
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Evaluates candidate rooms for a request and returns feasible rooms.
 */
export function getFeasibleRooms(
  request: BookingRequest,
  rooms: Room[],
  currentAssignments: { roomId: string; slot: TimeSlot }[]
): { room: Room; validation: HardConstraintValidationResult }[] {
  return rooms.map((room) => ({
    room,
    validation: validateAssignmentStrict(request, room, currentAssignments),
  }));
}

/**
 * Computes allocation metrics according to standard definitions.
 */
export function computeAllocationMetrics(
  requests: BookingRequest[],
  assignments: { bookingId: string; roomId: string }[],
  unassigned: UnassignedBookingDetail[],
  rooms: Room[],
  executionTimeMs: number
) {
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const requestMap = new Map(requests.map((req) => [req.id, req]));

  let totalWaste = 0;
  for (const a of assignments) {
    const room = roomMap.get(a.roomId);
    const req = requestMap.get(a.bookingId);
    if (room && req) {
      totalWaste += Math.max(0, room.capacity - req.enrollmentCount);
    }
  }

  const capacityWasteAverage = assignments.length > 0 ? Number((totalWaste / assignments.length).toFixed(2)) : 0;

  return {
    totalRequested: requests.length,
    assignedCount: assignments.length,
    unassignedCount: unassigned.length,
    capacityWasteAverage,
    executionTimeMs,
  };
}

/**
 * Baseline: First-Fit Allocation Algorithm
 */
export function runFirstFitAllocation(
  requests: BookingRequest[],
  rooms: Room[]
): AllocationResult {
  const startTime = Date.now();
  const assignments: AllocationAssignment[] = [];
  const unassigned: UnassignedBookingDetail[] = [];
  const assignedSlots: { roomId: string; slot: TimeSlot }[] = [];

  for (const req of requests) {
    let assigned = false;
    const failureReasons: string[] = [];

    for (const room of rooms) {
      const validation = validateAssignmentStrict(req, room, assignedSlots);
      if (validation.isValid) {
        assignments.push({
          bookingId: req.id,
          roomId: room.id,
          explanation: `First-Fit assigned room ${room.code} (capacity ${room.capacity}) to '${req.title}'.`,
        });
        assignedSlots.push({ roomId: room.id, slot: req.slot });
        assigned = true;
        break;
      } else {
        failureReasons.push(`${room.code}: ${validation.violations.join('; ')}`);
      }
    }

    if (!assigned) {
      unassigned.push({
        bookingId: req.id,
        reason: failureReasons.length > 0 ? failureReasons.join(' | ') : 'No rooms available in system',
        evaluatedRoomsCount: rooms.length,
      });
    }
  }

  const executionTimeMs = Math.max(1, Date.now() - startTime);

  return {
    method: 'FIRST_FIT',
    assignments,
    unassigned,
    metrics: computeAllocationMetrics(requests, assignments, unassigned, rooms, executionTimeMs),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Improved Heuristic Allocation Algorithm
 * 1. Prioritizes requests with fewer eligible rooms (most constrained first).
 * 2. Breaks ties with larger enrollment count.
 * 3. Chooses room that minimizes capacity waste (best-fit on capacity).
 */
export function runHeuristicAllocation(
  requests: BookingRequest[],
  rooms: Room[]
): AllocationResult {
  const startTime = Date.now();
  const assignments: AllocationAssignment[] = [];
  const unassigned: UnassignedBookingDetail[] = [];
  const assignedSlots: { roomId: string; slot: TimeSlot }[] = [];

  // Pre-calculate feasibility score for ordering
  const scoredRequests = requests.map((req) => {
    // Count rooms that satisfy static constraints (capacity, facilities, not blocked)
    const eligibleCount = rooms.filter(
      (r) => !r.isBlocked && r.capacity >= req.enrollmentCount && req.requiredFacilities.every((f) => r.facilities.includes(f))
    ).length;

    return { req, eligibleCount };
  });

  // Sort: most constrained first (lowest eligibleCount), then largest enrollment
  scoredRequests.sort((a, b) => {
    if (a.eligibleCount !== b.eligibleCount) {
      return a.eligibleCount - b.eligibleCount;
    }
    return b.req.enrollmentCount - a.req.enrollmentCount;
  });

  for (const { req } of scoredRequests) {
    // Find all currently valid candidate rooms
    const candidates = rooms
      .map((room) => ({
        room,
        validation: validateAssignmentStrict(req, room, assignedSlots),
        waste: room.capacity - req.enrollmentCount,
      }))
      .filter((c) => c.validation.isValid);

    if (candidates.length > 0) {
      // Pick room that minimizes capacity waste
      candidates.sort((a, b) => a.waste - b.waste);
      const chosen = candidates[0].room;

      assignments.push({
        bookingId: req.id,
        roomId: chosen.id,
        explanation: `Improved Heuristic assigned best-fit room ${chosen.code} (capacity ${chosen.capacity}, waste ${chosen.capacity - req.enrollmentCount}).`,
      });
      assignedSlots.push({ roomId: chosen.id, slot: req.slot });
    } else {
      unassigned.push({
        bookingId: req.id,
        reason: `No feasible room available satisfying constraints for slot ${req.slot.dayOfWeek} ${req.slot.startTime}-${req.slot.endTime}`,
        evaluatedRoomsCount: rooms.length,
      });
    }
  }

  const executionTimeMs = Math.max(1, Date.now() - startTime);

  return {
    method: 'HEURISTIC',
    assignments,
    unassigned,
    metrics: computeAllocationMetrics(requests, assignments, unassigned, rooms, executionTimeMs),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Disruption Recovery Engine
 * Handles sudden room closure and performs minimal-churn reassignment.
 */
export function runDisruptionRecovery(
  event: DisruptionEvent,
  currentAssignments: AllocationAssignment[],
  requests: BookingRequest[],
  rooms: Room[]
): RecoveryReport {
  const requestMap = new Map(requests.map((r) => [r.id, r]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // 1. Separate affected vs unaffected assignments
  const affected = currentAssignments.filter((a) => a.roomId === event.roomId);
  const unaffected = currentAssignments.filter((a) => a.roomId !== event.roomId);

  // 2. Active assignments for unaffected rooms
  const activeAssignedSlots: { roomId: string; slot: TimeSlot }[] = unaffected
    .map((a) => {
      const req = requestMap.get(a.bookingId);
      return req ? { roomId: a.roomId, slot: req.slot } : null;
    })
    .filter((v): v is { roomId: string; slot: TimeSlot } => v !== null);

  // 3. Mark closed room as blocked
  const availableRooms = rooms.map((r) =>
    r.id === event.roomId ? { ...r, isBlocked: true, blockReason: event.reason } : r
  );

  const reassignedBookings: RecoveryReport['reassignedBookings'] = [];
  const unresolvedBookingIds: RecoveryReport['unresolvedBookingIds'] = [];

  // 4. Attempt reassignment for affected bookings
  for (const aff of affected) {
    const req = requestMap.get(aff.bookingId);
    if (!req) continue;

    // Filter candidate rooms (excluding closed room)
    const candidates = availableRooms
      .filter((r) => r.id !== event.roomId)
      .map((room) => ({
        room,
        validation: validateAssignmentStrict(req, room, activeAssignedSlots),
        waste: room.capacity - req.enrollmentCount,
      }))
      .filter((c) => c.validation.isValid);

    if (candidates.length > 0) {
      // Pick best fit to minimize waste
      candidates.sort((a, b) => a.waste - b.waste);
      const chosen = candidates[0].room;

      reassignedBookings.push({
        bookingId: req.id,
        previousRoomId: aff.roomId,
        newRoomId: chosen.id,
        explanation: `Reassigned from closed room to ${chosen.code} (capacity ${chosen.capacity}) due to ${event.reason}.`,
      });
      activeAssignedSlots.push({ roomId: chosen.id, slot: req.slot });
    } else {
      unresolvedBookingIds.push({
        bookingId: req.id,
        reason: `No alternative room available meeting constraints during recovery after room ${event.roomId} closure.`,
      });
    }
  }

  return {
    closedRoomId: event.roomId,
    affectedBookingIds: affected.map((a) => a.bookingId),
    reassignedBookings,
    unresolvedBookingIds,
    unaffectedAssignmentsPreservedCount: unaffected.length,
    totalAssignmentsChangedCount: reassignedBookings.length,
    timestamp: new Date().toISOString(),
  };
}
