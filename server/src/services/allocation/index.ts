import mongoose from 'mongoose';
import {
  AllocationAssignment,
  AllocationMethod,
  AllocationResult,
  BookingRequest,
  HardConstraintValidationResult,
  Room,
  RoomClosure,
  TimeSlot,
  UnassignedBookingDetail,
} from '../../../../shared/types/index.js';
import {
  BookingModel,
  RoomModel,
  RoomClosureModel,
  AllocationRunModel,
} from '../../models/index.js';
import { validationService, doSlotsOverlap } from '../validation/index.js';
import { mockRooms, mockBookingRequests } from '../../../tests/fixtures/sharedFixtures.js';

export interface AllocationOptions {
  closures?: RoomClosure[];
  userId?: string;
  saveRecord?: boolean;
}

export interface IAllocationService {
  runAllocation(
    requests?: BookingRequest[],
    rooms?: Room[],
    method?: AllocationMethod,
    options?: AllocationOptions
  ): Promise<AllocationResult>;
}

export class AllocationService implements IAllocationService {
  public async runAllocation(
    customRequests?: BookingRequest[],
    customRooms?: Room[],
    method: AllocationMethod = 'HEURISTIC',
    options: AllocationOptions = {}
  ): Promise<AllocationResult> {
    const startTime = Date.now();

    if (method !== 'FIRST_FIT' && method !== 'HEURISTIC') {
      throw new Error(`Unsupported allocation method: '${method}'. Must be FIRST_FIT or HEURISTIC.`);
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    // 1. Resolve Request Dataset
    let requests: BookingRequest[] = [];
    if (customRequests && customRequests.length > 0) {
      requests = customRequests;
    } else if (isDbConnected) {
      const dbBookings = await BookingModel.find({ status: { $in: ['PENDING', 'APPROVED'] } }).lean();
      requests = dbBookings.map((b) => ({
        id: String(b._id),
        title: b.title,
        requesterId: String(b.requesterId),
        requesterRole: b.requesterRole,
        department: b.department,
        enrollmentCount: b.enrollmentCount,
        requiredFacilities: b.requiredFacilities || [],
        slot: b.slot,
        status: b.status,
        assignedRoomId: b.assignedRoomId ? String(b.assignedRoomId) : undefined,
        createdAt: b.createdAt ? new Date(b.createdAt as any).toISOString() : new Date().toISOString(),
      }));
    } else {
      requests = mockBookingRequests;
    }

    // 2. Resolve Room Dataset
    let rooms: Room[] = [];
    if (customRooms && customRooms.length > 0) {
      rooms = customRooms;
    } else if (isDbConnected) {
      const dbRooms = await RoomModel.find({}).lean();
      rooms = dbRooms.map((r) => ({
        id: String(r._id),
        code: r.code,
        name: r.name,
        capacity: r.capacity,
        facilities: r.facilities || [],
        building: r.building,
        floor: r.floor,
        isBlocked: r.isBlocked,
        blockReason: r.blockReason,
      }));
    } else {
      rooms = mockRooms;
    }

    // 3. Resolve Active Room Closures
    let closures: RoomClosure[] = [];
    if (options.closures) {
      closures = options.closures;
    } else if (isDbConnected) {
      const dbClosures = await RoomClosureModel.find({ status: 'ACTIVE' }).lean();
      closures = dbClosures.map((c) => ({
        id: String(c._id),
        roomId: String(c.roomId),
        reason: c.reason,
        closedBy: c.closedBy ? String(c.closedBy) : undefined,
        slot: c.slot,
        status: c.status,
      }));
    }

    // 4. Run Selection Algorithm
    let assignments: AllocationAssignment[] = [];
    let unassigned: UnassignedBookingDetail[] = [];

    if (method === 'FIRST_FIT') {
      const res = this.executeFirstFit(requests, rooms, closures);
      assignments = res.assignments;
      unassigned = res.unassigned;
    } else {
      const res = this.executeHeuristic(requests, rooms, closures);
      assignments = res.assignments;
      unassigned = res.unassigned;
    }

    const executionTimeMs = Math.max(1, Date.now() - startTime);

    // Compute Capacity Waste Average
    const roomMap = new Map(rooms.map((r) => [String(r.id || r.code), r]));
    const requestMap = new Map(requests.map((req) => [String(req.id), req]));

    let totalWaste = 0;
    for (const a of assignments) {
      const room = roomMap.get(String(a.roomId));
      const req = requestMap.get(String(a.bookingId));
      if (room && req) {
        totalWaste += Math.max(0, room.capacity - req.enrollmentCount);
      }
    }
    const capacityWasteAverage =
      assignments.length > 0 ? Number((totalWaste / assignments.length).toFixed(2)) : 0;

    const metrics = {
      totalRequested: requests.length,
      assignedCount: assignments.length,
      unassignedCount: unassigned.length,
      capacityWasteAverage,
      executionTimeMs,
    };

    // 5. Phase 4: Independent Post-Allocation Validation
    const validation: HardConstraintValidationResult = validationService.validateAllocation(
      assignments,
      requests,
      rooms,
      closures
    );

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result: AllocationResult = {
      runId,
      method,
      assignments,
      unassigned,
      metrics,
      validation,
      timestamp: new Date().toISOString(),
    };

    // 6. DB Record Persistence
    if (isDbConnected && options.saveRecord !== false) {
      try {
        await AllocationRunModel.create({
          method,
          assignments: assignments.map((a) => ({
            bookingId: a.bookingId,
            roomId: a.roomId,
            explanation: a.explanation,
          })),
          unassigned: unassigned.map((u) => ({
            bookingId: u.bookingId,
            reason: u.reason,
            evaluatedRoomsCount: u.evaluatedRoomsCount,
          })),
          metrics,
          status: validation.isValid ? 'SUCCESS' : 'FAILED',
          triggeredBy: options.userId && mongoose.Types.ObjectId.isValid(options.userId)
            ? new mongoose.Types.ObjectId(options.userId)
            : undefined,
        });
      } catch (err) {
        console.warn('⚠️ Could not save AllocationRun record to MongoDB:', err);
      }
    }

    return result;
  }

  /**
   * Baseline First-Fit Allocation Algorithm
   */
  private executeFirstFit(
    requests: BookingRequest[],
    rooms: Room[],
    closures: RoomClosure[]
  ): { assignments: AllocationAssignment[]; unassigned: UnassignedBookingDetail[] } {
    const assignments: AllocationAssignment[] = [];
    const unassigned: UnassignedBookingDetail[] = [];
    const assignedSlots: { roomId: string; slot: TimeSlot }[] = [];

    for (const req of requests) {
      let assigned = false;
      const failureReasons: string[] = [];

      for (const room of rooms) {
        const canonicalRoomId = String(room.id || room.code);

        // Check Hard Constraints
        const validation = validationService.validateAssignment(req, room, assignedSlots, closures);
        if (validation.isValid) {
          assignments.push({
            bookingId: String(req.id),
            roomId: canonicalRoomId,
            explanation: `First-Fit assigned room ${room.code} (capacity ${room.capacity}) for '${req.title}'.`,
          });
          assignedSlots.push({ roomId: canonicalRoomId, slot: req.slot });
          assigned = true;
          break;
        } else {
          failureReasons.push(`${room.code}: ${validation.violations.join('; ')}`);
        }
      }

      if (!assigned) {
        unassigned.push({
          bookingId: String(req.id),
          reason:
            failureReasons.length > 0
              ? failureReasons.join(' | ')
              : `No rooms available in system for slot ${req.slot.dayOfWeek} ${req.slot.startTime}-${req.slot.endTime}`,
          evaluatedRoomsCount: rooms.length,
        });
      }
    }

    return { assignments, unassigned };
  }

  /**
   * Improved Heuristic Allocation Algorithm
   * 1. Pre-calculates static constraint feasibility count per request.
   * 2. Sorts requests by constraint score (most constrained first) and enrollment tie-break.
   * 3. Selects candidate room minimizing capacity waste + soft preference penalty.
   */
  private executeHeuristic(
    requests: BookingRequest[],
    rooms: Room[],
    closures: RoomClosure[]
  ): { assignments: AllocationAssignment[]; unassigned: UnassignedBookingDetail[] } {
    const assignments: AllocationAssignment[] = [];
    const unassigned: UnassignedBookingDetail[] = [];
    const assignedSlots: { roomId: string; slot: TimeSlot }[] = [];

    // Pre-calculate feasibility score for ordering
    const scoredRequests = requests.map((req) => {
      // Count rooms satisfying static constraints (not blocked, capacity, facilities, active closures)
      const eligibleCount = rooms.filter((r) => {
        const canonicalId = String(r.id || r.code);
        if (r.isBlocked) return false;
        if (r.capacity < req.enrollmentCount) return false;
        if (!req.requiredFacilities.every((f) => r.facilities.includes(f))) return false;

        const hasClosure = closures.some(
          (c) =>
            c.status === 'ACTIVE' &&
            (String(c.roomId) === canonicalId || String(c.roomId) === r.code) &&
            (!c.slot || doSlotsOverlap(req.slot, c.slot))
        );
        return !hasClosure;
      }).length;

      return { req, eligibleCount };
    });

    // Sort: Most constrained first (eligibleCount ascending), then enrollment (descending), then ID
    scoredRequests.sort((a, b) => {
      if (a.eligibleCount !== b.eligibleCount) {
        return a.eligibleCount - b.eligibleCount;
      }
      if (b.req.enrollmentCount !== a.req.enrollmentCount) {
        return b.req.enrollmentCount - a.req.enrollmentCount;
      }
      return String(a.req.id).localeCompare(String(b.req.id));
    });

    for (const { req } of scoredRequests) {
      const candidateRooms = rooms
        .map((room) => {
          const canonicalRoomId = String(room.id || room.code);
          const validation = validationService.validateAssignment(req, room, assignedSlots, closures);

          // Soft Preference Scoring Policy:
          // 1. Capacity Waste: room.capacity - req.enrollmentCount
          // 2. Floor penalty: room.floor * 2 (prefers ground/lower floor for large classes)
          // 3. Excess facilities penalty: (room.facilities.length - req.requiredFacilities.length) * 1
          const capacityWaste = room.capacity - req.enrollmentCount;
          const floorPenalty = room.floor * 2;
          const facilityPenalty = Math.max(0, room.facilities.length - req.requiredFacilities.length) * 1;
          const totalScore = capacityWaste + floorPenalty + facilityPenalty;

          return {
            room,
            canonicalRoomId,
            validation,
            capacityWaste,
            totalScore,
          };
        })
        .filter((c) => c.validation.isValid);

      if (candidateRooms.length > 0) {
        // Sort by totalScore ascending (best fit)
        candidateRooms.sort((a, b) => a.totalScore - b.totalScore);
        const chosen = candidateRooms[0];

        assignments.push({
          bookingId: String(req.id),
          roomId: chosen.canonicalRoomId,
          explanation: `Improved Heuristic assigned best-fit room ${chosen.room.code} (capacity ${chosen.room.capacity}, waste ${chosen.capacityWaste}) for '${req.title}'.`,
        });

        assignedSlots.push({ roomId: chosen.canonicalRoomId, slot: req.slot });
      } else {
        unassigned.push({
          bookingId: String(req.id),
          reason: `No feasible room available satisfying constraints for slot ${req.slot.dayOfWeek} ${req.slot.startTime}-${req.slot.endTime}`,
          evaluatedRoomsCount: rooms.length,
        });
      }
    }

    return { assignments, unassigned };
  }
}

export const allocationService = new AllocationService();
