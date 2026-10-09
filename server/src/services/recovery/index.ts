import mongoose from 'mongoose';
import {
  AllocationAssignment,
  BookingRequest,
  DisruptionEvent,
  RecoveryReport,
  Room,
  RoomClosure,
  TimeSlot,
} from '../../../../shared/types/index.js';
import {
  BookingModel,
  RoomModel,
  RoomClosureModel,
  AuditLogModel,
  AllocationRunModel,
} from '../../models/index.js';
import { validationService, doSlotsOverlap } from '../validation/index.js';
import { allocationService } from '../allocation/index.js';
import { mockRooms, mockBookingRequests } from '../../../tests/fixtures/sharedFixtures.js';

export interface RecoveryOptions {
  currentAssignments?: AllocationAssignment[];
  requests?: BookingRequest[];
  rooms?: Room[];
  closures?: RoomClosure[];
  userId?: string;
}

export interface IRecoveryService {
  handleRoomClosure(
    event: DisruptionEvent,
    options?: RecoveryOptions
  ): Promise<RecoveryReport>;
}

export class RecoveryService implements IRecoveryService {
  public async handleRoomClosure(
    event: DisruptionEvent,
    options: RecoveryOptions = {}
  ): Promise<RecoveryReport> {
    const isDbConnected = mongoose.connection.readyState === 1;

    // 1. Resolve Request Dataset
    let requests: BookingRequest[] = [];
    if (options.requests && options.requests.length > 0) {
      requests = options.requests;
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

    const requestMap = new Map<string, BookingRequest>();
    for (const r of requests) {
      requestMap.set(String(r.id), r);
    }

    // 2. Resolve Room Dataset
    let rooms: Room[] = [];
    if (options.rooms && options.rooms.length > 0) {
      rooms = options.rooms;
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

    // Identify target room being closed
    const targetRoom = rooms.find(
      (r) => String(r.id) === event.roomId || r.code === event.roomId
    );
    const closedRoomId = targetRoom ? String(targetRoom.id || targetRoom.code) : event.roomId;
    const closedRoomCode = targetRoom?.code || event.roomId;

    // 3. Resolve Current Assignments Baseline
    let currentAssignments: AllocationAssignment[] = [];
    if (options.currentAssignments && options.currentAssignments.length > 0) {
      currentAssignments = options.currentAssignments;
    } else if (isDbConnected) {
      const latestRun = await AllocationRunModel.findOne({ status: 'SUCCESS' })
        .sort({ createdAt: -1 })
        .lean();
      if (latestRun && latestRun.assignments.length > 0) {
        currentAssignments = latestRun.assignments.map((a) => ({
          bookingId: String(a.bookingId),
          roomId: String(a.roomId),
          explanation: a.explanation,
        }));
      } else {
        currentAssignments = requests
          .filter((req) => req.assignedRoomId)
          .map((req) => ({
            bookingId: String(req.id),
            roomId: String(req.assignedRoomId),
            explanation: 'Database pre-assigned room',
          }));
      }
    }

    // Fallback if no baseline assignments found
    if (currentAssignments.length === 0) {
      const allocResult = await allocationService.runAllocation(requests, rooms, 'HEURISTIC', {
        saveRecord: false,
      });
      currentAssignments = allocResult.assignments;
    }

    // 4. Resolve Existing Active Closures
    let closures: RoomClosure[] = options.closures || [];
    if (!options.closures && isDbConnected) {
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

    // 5. Separate Affected vs Unaffected Assignments
    const affected: AllocationAssignment[] = [];
    const unaffected: AllocationAssignment[] = [];

    for (const a of currentAssignments) {
      const isTargetRoom =
        String(a.roomId) === closedRoomId || String(a.roomId) === closedRoomCode;
      if (!isTargetRoom) {
        unaffected.push(a);
        continue;
      }

      const req = requestMap.get(String(a.bookingId));
      if (!req) {
        unaffected.push(a);
        continue;
      }

      // Check slot match if event.slot is provided
      if (event.slot && !doSlotsOverlap(req.slot, event.slot)) {
        unaffected.push(a);
      } else {
        affected.push(a);
      }
    }

    // 6. Record DB Closure & Update Target Room
    if (isDbConnected) {
      try {
        if (targetRoom && mongoose.Types.ObjectId.isValid(closedRoomId)) {
          await RoomModel.updateOne(
            { _id: closedRoomId },
            { isBlocked: true, blockReason: event.reason }
          );
          await RoomClosureModel.create({
            roomId: new mongoose.Types.ObjectId(closedRoomId),
            reason: event.reason,
            slot: event.slot,
            status: 'ACTIVE',
            closedBy:
              options.userId && mongoose.Types.ObjectId.isValid(options.userId)
                ? new mongoose.Types.ObjectId(options.userId)
                : undefined,
          });
        }
      } catch (err) {
        console.warn('⚠️ Could not update Room/RoomClosure in DB:', err);
      }
    }

    // 7. Active assigned slots tracking for unaffected rooms
    const activeAssignedSlots: { roomId: string; slot: TimeSlot; bookingId?: string }[] = [];
    for (const a of unaffected) {
      const req = requestMap.get(String(a.bookingId));
      if (req) {
        activeAssignedSlots.push({ roomId: String(a.roomId), slot: req.slot, bookingId: String(req.id) });
      }
    }

    // Dynamic active closures set
    const activeClosures: RoomClosure[] = [
      ...closures,
      {
        roomId: closedRoomId,
        reason: event.reason,
        slot: event.slot,
        status: 'ACTIVE',
      },
    ];

    const reassignedBookings: RecoveryReport['reassignedBookings'] = [];
    const unresolvedBookingIds: RecoveryReport['unresolvedBookingIds'] = [];
    const finalAssignments: AllocationAssignment[] = [...unaffected];

    // 8. Reassignment Loop for Affected Bookings
    for (const aff of affected) {
      const req = requestMap.get(String(aff.bookingId));
      if (!req) continue;

      // Filter available candidate rooms
      const candidateRooms = rooms
        .filter(
          (r) =>
            String(r.id) !== closedRoomId &&
            r.code !== closedRoomCode &&
            !r.isBlocked
        )
        .map((room) => {
          const canonicalId = String(room.id || room.code);
          const validation = validationService.validateAssignment(
            req,
            room,
            activeAssignedSlots,
            activeClosures
          );
          const capacityWaste = room.capacity - req.enrollmentCount;
          return {
            room,
            canonicalId,
            validation,
            capacityWaste,
          };
        })
        .filter((c) => c.validation.isValid);

      if (candidateRooms.length > 0) {
        // Best fit: minimize capacity waste
        candidateRooms.sort((a, b) => a.capacityWaste - b.capacityWaste);
        const chosen = candidateRooms[0];

        const explanation = `Reassigned from closed room ${closedRoomCode} to ${chosen.room.code} (capacity ${chosen.room.capacity}, waste ${chosen.capacityWaste}) due to disruption: ${event.reason}.`;

        reassignedBookings.push({
          bookingId: String(req.id),
          previousRoomId: String(aff.roomId),
          newRoomId: chosen.canonicalId,
          explanation,
        });

        finalAssignments.push({
          bookingId: String(req.id),
          roomId: chosen.canonicalId,
          explanation,
        });

        activeAssignedSlots.push({
          roomId: chosen.canonicalId,
          slot: req.slot,
          bookingId: String(req.id),
        });

        // Update DB booking document if connected
        if (isDbConnected && mongoose.Types.ObjectId.isValid(req.id)) {
          try {
            await BookingModel.updateOne(
              { _id: req.id },
              { assignedRoomId: new mongoose.Types.ObjectId(chosen.canonicalId) }
            );
          } catch (err) {
            console.warn(`⚠️ Could not update assignedRoomId for booking ${req.id}:`, err);
          }
        }
      } else {
        const reqSlotStr = `${req.slot.dayOfWeek} (${req.slot.startTime}-${req.slot.endTime})`;
        unresolvedBookingIds.push({
          bookingId: String(req.id),
          reason: `No alternative room meeting constraints (capacity ${req.enrollmentCount}, facilities [${req.requiredFacilities.join(', ')}], open slot ${reqSlotStr}) during recovery after room ${closedRoomCode} closure.`,
        });
      }
    }

    // 9. Independent Post-Recovery Hard-Constraint Validation
    const validation = validationService.validateAllocation(
      finalAssignments,
      requests,
      rooms,
      activeClosures
    );

    if (!validation.isValid) {
      console.warn('⚠️ Independent validation detected post-recovery violations:', validation.violations);
    }

    // 10. Audit Log Persistence
    if (isDbConnected) {
      try {
        await AuditLogModel.create({
          action: 'DISRUPTION_RECOVERY_EXECUTED',
          resource: `RoomClosure:${closedRoomId}`,
          userRole: 'SYSTEM_ADMIN',
          details: {
            closedRoomId,
            reason: event.reason,
            affectedCount: affected.length,
            reassignedCount: reassignedBookings.length,
            unresolvedCount: unresolvedBookingIds.length,
            validationPassed: validation.isValid,
          },
        });
      } catch (err) {
        console.warn('⚠️ Could not log audit entry for recovery execution:', err);
      }
    }

    return {
      closedRoomId,
      affectedBookingIds: affected.map((a) => String(a.bookingId)),
      reassignedBookings,
      unresolvedBookingIds,
      unaffectedAssignmentsPreservedCount: unaffected.length,
      totalAssignmentsChangedCount: reassignedBookings.length,
      timestamp: new Date().toISOString(),
    };
  }
}

export const recoveryService = new RecoveryService();
