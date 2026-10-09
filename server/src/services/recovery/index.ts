import mongoose from 'mongoose';
import {
  AllocationAssignment,
  BookingRequest,
  DisruptionEvent,
  RecoveryReport,
  Room,
  RoomClosure,
  TimeSlot,
  UserRole,
} from '../../../../shared/types/index.js';
import {
  BookingModel,
  RoomModel,
  RoomClosureModel,
  AuditLogModel,
} from '../../models/index.js';
import { validationService, doSlotsOverlap } from '../validation/index.js';
import { mockRooms, mockBookingRequests } from '../../../tests/fixtures/sharedFixtures.js';

export interface RecoveryOptions {
  currentAssignments?: AllocationAssignment[];
  requests?: BookingRequest[];
  rooms?: Room[];
  closures?: RoomClosure[];
  userId?: string;
  userRole?: UserRole;
}

export interface IRecoveryService {
  handleRoomClosure(
    event: DisruptionEvent,
    options?: RecoveryOptions
  ): Promise<RecoveryReport>;
}

function toObjectId(id?: string): mongoose.Types.ObjectId {
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  if (id && typeof id === 'string') {
    const hex = Buffer.from(id).toString('hex').padEnd(24, '0').slice(0, 24);
    if (mongoose.Types.ObjectId.isValid(hex)) {
      return new mongoose.Types.ObjectId(hex);
    }
  }
  return new mongoose.Types.ObjectId();
}

export class RecoveryService implements IRecoveryService {
  public async handleRoomClosure(
    event: DisruptionEvent,
    options: RecoveryOptions = {}
  ): Promise<RecoveryReport> {
    const isDbConnected = mongoose.connection.readyState === 1;

    // 1. Resolve Request Dataset (Including PENDING, APPROVED, and ALLOCATED bookings)
    let requests: BookingRequest[] = [];
    if (options.requests && options.requests.length > 0) {
      requests = options.requests;
    } else if (isDbConnected) {
      const dbBookings = await BookingModel.find({
        status: { $in: ['PENDING', 'APPROVED', 'ALLOCATED'] },
      }).lean();
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
        unassignedReason: b.unassignedReason,
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

    // 3. Resolve Baseline Current Assignments
    let currentAssignments: AllocationAssignment[] = [];
    if (options.currentAssignments && options.currentAssignments.length > 0) {
      currentAssignments = options.currentAssignments;
    } else {
      currentAssignments = requests
        .filter((req) => req.assignedRoomId)
        .map((req) => ({
          bookingId: String(req.id),
          roomId: String(req.assignedRoomId),
          explanation: 'Current assigned room',
        }));
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

    // 5. Separate Affected vs Unaffected Assignments (Slot-Scoped vs Full-Room)
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

      // Slot-Scoped Closure check:
      if (event.slot) {
        if (doSlotsOverlap(req.slot, event.slot)) {
          affected.push(a);
        } else {
          unaffected.push(a);
        }
      } else {
        // Full room closure without slot -> affects all slots
        affected.push(a);
      }
    }

    // 6. Active Assigned Slots Tracking for Unaffected Rooms
    const activeAssignedSlots: { roomId: string; slot: TimeSlot; bookingId?: string }[] = [];
    for (const a of unaffected) {
      const req = requestMap.get(String(a.bookingId));
      if (req) {
        activeAssignedSlots.push({
          roomId: String(a.roomId),
          slot: req.slot,
          bookingId: String(req.id),
        });
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
    const candidateFinalAssignments: AllocationAssignment[] = [...unaffected];

    // 7. Reassignment Loop for Affected Bookings
    for (const aff of affected) {
      const req = requestMap.get(String(aff.bookingId));
      if (!req) continue;

      // Filter available candidate rooms (excluding closed room)
      const candidateRooms = rooms
        .filter(
          (r) =>
            String(r.id) !== closedRoomId &&
            r.code !== closedRoomCode
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
        // Best-fit selection minimizing capacity waste
        candidateRooms.sort((a, b) => a.capacityWaste - b.capacityWaste);
        const chosen = candidateRooms[0];

        const explanation = `Reassigned from closed room ${closedRoomCode} to ${chosen.room.code} (capacity ${chosen.room.capacity}, waste ${chosen.capacityWaste}) due to disruption: ${event.reason}.`;

        reassignedBookings.push({
          bookingId: String(req.id),
          previousRoomId: String(aff.roomId),
          newRoomId: chosen.canonicalId,
          explanation,
        });

        candidateFinalAssignments.push({
          bookingId: String(req.id),
          roomId: chosen.canonicalId,
          explanation,
        });

        activeAssignedSlots.push({
          roomId: chosen.canonicalId,
          slot: req.slot,
          bookingId: String(req.id),
        });
      } else {
        const reqSlotStr = `${req.slot.dayOfWeek} (${req.slot.startTime}-${req.slot.endTime})`;
        unresolvedBookingIds.push({
          bookingId: String(req.id),
          reason: `No alternative room meeting constraints (capacity ${req.enrollmentCount}, facilities [${req.requiredFacilities.join(', ')}], slot ${reqSlotStr}) during recovery after room ${closedRoomCode} closure.`,
        });
      }
    }

    // 8. Independent Pre-Commit Candidate Allocation Validation (Fail-Closed)
    const validation = validationService.validateAllocation(
      candidateFinalAssignments,
      requests,
      rooms,
      activeClosures
    );

    if (!validation.isValid) {
      throw new Error(
        `Recovery candidate allocation failed independent validation: ${validation.violations.join('; ')}`
      );
    }

    // 9. Concurrency & DB Persistence with Session/Transaction and Fallback Compensation Rollback
    if (isDbConnected) {
      let session: mongoose.ClientSession | null = null;
      let useTransaction = false;

      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch {
        useTransaction = false;
        if (session) {
          session.endSession();
          session = null;
        }
      }

      const sessionOpt = session && useTransaction ? { session } : {};

      // Compensation tracking for fallback rollback
      let createdClosureId: mongoose.Types.ObjectId | null = null;
      let prevRoomBlockedState: { roomId: string; isBlocked: boolean; blockReason?: string } | null = null;
      const updatedBookingsState: { bookingId: string; prevAssignedRoomId?: mongoose.Types.ObjectId; prevUnassignedReason?: string }[] = [];
      let createdAuditLogId: mongoose.Types.ObjectId | null = null;

      try {
        // Concurrency Revalidation
        for (const reassigned of reassignedBookings) {
          const req = requestMap.get(reassigned.bookingId);
          if (req && mongoose.Types.ObjectId.isValid(reassigned.newRoomId)) {
            const liveDestRoom = await RoomModel.findById(reassigned.newRoomId).lean();
            if (liveDestRoom && liveDestRoom.isBlocked) {
              throw new Error(`Concurrency conflict: Destination room ${liveDestRoom.code} is blocked.`);
            }

            const overlappingDbBookings = await BookingModel.find({
              assignedRoomId: new mongoose.Types.ObjectId(reassigned.newRoomId),
              _id: { $ne: new mongoose.Types.ObjectId(reassigned.bookingId) },
              'slot.dayOfWeek': req.slot.dayOfWeek,
              status: { $in: ['PENDING', 'APPROVED', 'ALLOCATED'] },
            }, null, sessionOpt).lean();

            for (const existingDbBooking of overlappingDbBookings) {
              if (doSlotsOverlap(req.slot, existingDbBooking.slot)) {
                throw new Error(
                  `Concurrency conflict: Room ${reassigned.newRoomId} was assigned by another process for slot ${req.slot.dayOfWeek} ${req.slot.startTime}-${req.slot.endTime}.`
                );
              }
            }
          }
        }

        // a. Create RoomClosure Document
        const closureObjId = toObjectId(closedRoomId);
        const closedByUserId = toObjectId(options.userId);

        const closureDocs = await RoomClosureModel.create(
          [
            {
              roomId: closureObjId,
              reason: event.reason,
              slot: event.slot,
              status: 'ACTIVE',
              closedBy: closedByUserId,
            },
          ],
          sessionOpt
        );
        if (closureDocs.length > 0) {
          createdClosureId = closureDocs[0]._id as mongoose.Types.ObjectId;
        }

        // b. Only set Room.isBlocked = true globally if full-room closure (!event.slot)
        if (!event.slot && targetRoom && mongoose.Types.ObjectId.isValid(closedRoomId)) {
          const roomBefore = await RoomModel.findById(closedRoomId).lean();
          if (roomBefore) {
            prevRoomBlockedState = {
              roomId: closedRoomId,
              isBlocked: roomBefore.isBlocked,
              blockReason: roomBefore.blockReason,
            };
          }
          await RoomModel.updateOne(
            { _id: closedRoomId },
            { isBlocked: true, blockReason: event.reason },
            sessionOpt
          );
        }

        // c. Persist Reassigned Booking Updates
        for (const reassigned of reassignedBookings) {
          if (mongoose.Types.ObjectId.isValid(reassigned.bookingId)) {
            const bBefore = await BookingModel.findById(reassigned.bookingId).lean();
            if (bBefore) {
              updatedBookingsState.push({
                bookingId: reassigned.bookingId,
                prevAssignedRoomId: bBefore.assignedRoomId,
                prevUnassignedReason: bBefore.unassignedReason,
              });
            }
            await BookingModel.updateOne(
              { _id: reassigned.bookingId },
              {
                assignedRoomId: mongoose.Types.ObjectId.isValid(reassigned.newRoomId)
                  ? new mongoose.Types.ObjectId(reassigned.newRoomId)
                  : reassigned.newRoomId,
                $unset: { unassignedReason: 1 },
              },
              sessionOpt
            );
          }
        }

        // d. Update Unresolved Bookings in DB
        for (const unresolved of unresolvedBookingIds) {
          if (mongoose.Types.ObjectId.isValid(unresolved.bookingId)) {
            const bBefore = await BookingModel.findById(unresolved.bookingId).lean();
            if (bBefore) {
              updatedBookingsState.push({
                bookingId: unresolved.bookingId,
                prevAssignedRoomId: bBefore.assignedRoomId,
                prevUnassignedReason: bBefore.unassignedReason,
              });
            }
            await BookingModel.updateOne(
              { _id: unresolved.bookingId },
              {
                $unset: { assignedRoomId: 1 },
                unassignedReason: unresolved.reason,
              },
              sessionOpt
            );
          }
        }

        // e. Create Audit Log Document with Authenticated Actor Context
        const actorUserId = toObjectId(options.userId);
        const actorRole: UserRole = options.userRole || 'SYSTEM_ADMIN';

        const auditDocs = await AuditLogModel.create(
          [
            {
              userId: actorUserId,
              userRole: actorRole,
              action: 'DISRUPTION_RECOVERY_EXECUTED',
              resource: `RoomClosure:${closedRoomId}`,
              details: {
                closedRoomId,
                reason: event.reason,
                affectedCount: affected.length,
                reassignedCount: reassignedBookings.length,
                unresolvedCount: unresolvedBookingIds.length,
                validationPassed: validation.isValid,
              },
            },
          ],
          sessionOpt
        );
        if (auditDocs.length > 0) {
          createdAuditLogId = auditDocs[0]._id as mongoose.Types.ObjectId;
        }

        if (session && useTransaction) {
          await session.commitTransaction();
        }
      } catch (err) {
        if (session && useTransaction) {
          await session.abortTransaction();
        } else {
          // Manual compensation / rollback for non-transactional mode
          try {
            if (createdClosureId) {
              await RoomClosureModel.deleteOne({ _id: createdClosureId });
            }
            if (prevRoomBlockedState) {
              await RoomModel.updateOne(
                { _id: prevRoomBlockedState.roomId },
                { isBlocked: prevRoomBlockedState.isBlocked, blockReason: prevRoomBlockedState.blockReason }
              );
            }
            for (const bState of updatedBookingsState) {
              const update: Record<string, any> = {};
              if (bState.prevAssignedRoomId) {
                update.assignedRoomId = bState.prevAssignedRoomId;
              } else {
                update.$unset = { assignedRoomId: 1 };
              }
              if (bState.prevUnassignedReason) {
                update.unassignedReason = bState.prevUnassignedReason;
              } else {
                update.$unset = { ...(update.$unset || {}), unassignedReason: 1 };
              }
              await BookingModel.updateOne({ _id: bState.bookingId }, update);
            }
            if (createdAuditLogId) {
              await AuditLogModel.deleteOne({ _id: createdAuditLogId });
            }
          } catch (rollbackErr) {
            console.error('Rollback compensation error during recovery failure:', rollbackErr);
          }
        }
        throw err;
      } finally {
        if (session) {
          session.endSession();
        }
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
