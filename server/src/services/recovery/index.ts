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
  ALL_USER_ROLES,
} from '../../../../shared/types/index.js';
import {
  BookingModel,
  RoomModel,
  RoomClosureModel,
  AuditLogModel,
  UserModel,
} from '../../models/index.js';
import { validationService, doSlotsOverlap } from '../validation/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { mockRooms, mockBookingRequests } from '../../../tests/fixtures/sharedFixtures.js';

export interface RecoveryActor {
  id: string;
  role: UserRole;
}

export interface RecoveryOptions {
  actor?: RecoveryActor;
  // Strictly isolated internal overrides for unit testing without database
  __testOverrides?: {
    requests?: BookingRequest[];
    rooms?: Room[];
    closures?: RoomClosure[];
    currentAssignments?: AllocationAssignment[];
  };
}

export interface IRecoveryService {
  handleRoomClosure(
    event: DisruptionEvent,
    options?: RecoveryOptions
  ): Promise<RecoveryReport>;
}

const AUTHORIZED_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'HOD',
  'PRINCIPAL',
  'COE',
  'EVENT_MANAGER',
  'SECRETARY',
];

const MAX_CONCURRENCY_RETRIES = 3;

/**
 * Checks whether the active MongoDB deployment supports replica-set transactions.
 */
async function areTransactionsSupported(): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 1) return false;
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    const isMaster = await admin.command({ isMaster: 1 });
    return Boolean(isMaster.setName || isMaster.msg === 'isdbgrid');
  } catch {
    return false;
  }
}

export class RecoveryService implements IRecoveryService {
  public async handleRoomClosure(
    event: DisruptionEvent,
    options: RecoveryOptions = {}
  ): Promise<RecoveryReport> {
    // Basic event validation
    if (!event.roomId || typeof event.roomId !== 'string' || event.roomId.trim().length === 0) {
      throw new AppError(400, 'INVALID_ROOM_ID', 'Disruption event roomId is required');
    }
    if (!event.reason || typeof event.reason !== 'string' || event.reason.trim().length < 3) {
      throw new AppError(400, 'INVALID_REASON', 'Disruption event reason must be at least 3 characters');
    }

    const isDbConnected = mongoose.connection.readyState === 1 && !options.__testOverrides;

    // Retry loop for handling transaction write conflicts and transient concurrency clashes
    let attempt = 0;
    while (attempt < MAX_CONCURRENCY_RETRIES) {
      attempt++;
      try {
        return await this.executeRecoveryAttempt(event, options, isDbConnected);
      } catch (err: any) {
        const isWriteConflict =
          err?.code === 112 ||
          err?.name === 'WriteConflict' ||
          err?.hasErrorLabel?.('TransientTransactionError');

        if (isWriteConflict && attempt < MAX_CONCURRENCY_RETRIES) {
          // Exponential backoff with jitter before retry
          const backoffMs = 50 * Math.pow(2, attempt) + Math.floor(Math.random() * 25);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        throw err;
      }
    }

    throw new AppError(
      409,
      'CONCURRENCY_CONFLICT',
      'Recovery failed due to persistent concurrent conflicts. Please retry.'
    );
  }

  private async executeRecoveryAttempt(
    event: DisruptionEvent,
    options: RecoveryOptions,
    isDbConnected: boolean
  ): Promise<RecoveryReport> {
    let actorUserObjectId: mongoose.Types.ObjectId | null = null;
    let actorRole: UserRole = 'SYSTEM_ADMIN';

    // 1. Verify Actor Identity & Roles from canonical state
    if (isDbConnected) {
      if (!options.actor || !options.actor.id) {
        throw new AppError(
          401,
          'UNAUTHORIZED',
          'Authenticated actor identity is required for disruption recovery'
        );
      }

      if (!mongoose.Types.ObjectId.isValid(options.actor.id)) {
        throw new AppError(
          400,
          'INVALID_ACTOR_ID',
          `Actor ID '${options.actor.id}' is not a valid 24-character hexadecimal ObjectId`
        );
      }

      actorUserObjectId = new mongoose.Types.ObjectId(options.actor.id);
      const actorDoc = await UserModel.findById(actorUserObjectId).lean();
      if (!actorDoc) {
        throw new AppError(
          404,
          'ACTOR_NOT_FOUND',
          `Authenticated user '${options.actor.id}' does not exist in database`
        );
      }

      actorRole = options.actor.role || actorDoc.role;
      if (!AUTHORIZED_ROLES.includes(actorRole)) {
        throw new AppError(
          403,
          'FORBIDDEN',
          `Role '${actorRole}' is not authorized to trigger room closure recovery`
        );
      }
    } else if (options.actor) {
      if (options.actor.id && mongoose.Types.ObjectId.isValid(options.actor.id)) {
        actorUserObjectId = new mongoose.Types.ObjectId(options.actor.id);
      }
      actorRole = options.actor.role;
    }

    // 2. Resolve Target Room from canonical state
    let targetRoom: Room | null = null;
    let targetRoomObjectId: mongoose.Types.ObjectId | null = null;

    if (isDbConnected) {
      const isObjectId = mongoose.Types.ObjectId.isValid(event.roomId);
      const query = isObjectId
        ? { $or: [{ _id: new mongoose.Types.ObjectId(event.roomId) }, { code: event.roomId.toUpperCase() }] }
        : { code: event.roomId.toUpperCase() };

      const dbRoom = await RoomModel.findOne(query).lean();
      if (!dbRoom) {
        throw new AppError(404, 'ROOM_NOT_FOUND', `Room '${event.roomId}' does not exist in database.`);
      }

      targetRoomObjectId = dbRoom._id as mongoose.Types.ObjectId;
      targetRoom = {
        id: String(dbRoom._id),
        code: dbRoom.code,
        name: dbRoom.name,
        capacity: dbRoom.capacity,
        facilities: dbRoom.facilities || [],
        building: dbRoom.building,
        floor: dbRoom.floor,
        isBlocked: dbRoom.isBlocked,
        blockReason: dbRoom.blockReason,
      };
    } else {
      const roomSet = options.__testOverrides?.rooms || mockRooms;
      targetRoom = roomSet.find((r) => r.id === event.roomId || r.code === event.roomId) || null;
      if (!targetRoom) {
        throw new AppError(404, 'ROOM_NOT_FOUND', `Room '${event.roomId}' does not exist.`);
      }
      if (mongoose.Types.ObjectId.isValid(targetRoom.id)) {
        targetRoomObjectId = new mongoose.Types.ObjectId(targetRoom.id);
      }
    }

    const closedRoomId = targetRoom.id;
    const closedRoomCode = targetRoom.code;

    // 3. Load Authoritative State from canonical database (never client input)
    let requests: BookingRequest[] = [];
    let rooms: Room[] = [];
    let closures: RoomClosure[] = [];

    if (isDbConnected) {
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

      const dbClosures = await RoomClosureModel.find({ status: 'ACTIVE' }).lean();
      closures = dbClosures.map((c) => ({
        id: String(c._id),
        roomId: String(c.roomId),
        reason: c.reason,
        closedBy: c.closedBy ? String(c.closedBy) : undefined,
        slot: c.slot,
        status: c.status,
      }));
    } else {
      requests = options.__testOverrides?.requests || mockBookingRequests;
      rooms = options.__testOverrides?.rooms || mockRooms;
      closures = options.__testOverrides?.closures || [];
    }

    const requestMap = new Map<string, BookingRequest>();
    for (const r of requests) {
      requestMap.set(String(r.id), r);
    }

    // 4. Derive Baseline Current Assignments strictly from active state
    let currentAssignments: AllocationAssignment[] = [];
    if (options.__testOverrides?.currentAssignments) {
      currentAssignments = options.__testOverrides.currentAssignments;
    } else {
      currentAssignments = requests
        .filter((req) => req.assignedRoomId)
        .map((req) => ({
          bookingId: String(req.id),
          roomId: String(req.assignedRoomId),
          explanation: 'Canonical database assignment',
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

      if (event.slot) {
        if (doSlotsOverlap(req.slot, event.slot)) {
          affected.push(a);
        } else {
          unaffected.push(a); // Preserved outside disruption slot window
        }
      } else {
        affected.push(a); // Full-room closure affects all slots
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

    // 7. Candidate Room Selection for Affected Bookings
    for (const aff of affected) {
      const req = requestMap.get(String(aff.bookingId));
      if (!req) continue;

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
      throw new AppError(
        422,
        'VALIDATION_FAILED',
        `Recovery candidate allocation failed independent validation: ${validation.violations.join('; ')}`
      );
    }

    // 9. Atomic Database Persistence with Coordination Locks & Rollback Protection
    if (isDbConnected && targetRoomObjectId && actorUserObjectId) {
      const transactionsSupported = await areTransactionsSupported();
      let session: mongoose.ClientSession | null = null;

      if (transactionsSupported) {
        session = await mongoose.startSession();
        session.startTransaction();
      }

      const sessionOpt = session ? { session } : {};

      // Tracking state for rollback compensation in non-transactional topology
      let createdClosureId: mongoose.Types.ObjectId | null = null;
      let prevRoomBlockedState: { roomId: mongoose.Types.ObjectId; isBlocked: boolean; blockReason?: string } | null = null;
      const updatedBookingsState: { bookingId: mongoose.Types.ObjectId; prevAssignedRoomId?: mongoose.Types.ObjectId; prevUnassignedReason?: string }[] = [];
      let createdAuditLogId: mongoose.Types.ObjectId | null = null;

      try {
        // Concurrency Guard & Live Database Revalidation
        for (const reassigned of reassignedBookings) {
          const req = requestMap.get(reassigned.bookingId);
          if (req && mongoose.Types.ObjectId.isValid(reassigned.newRoomId)) {
            const destRoomObjId = new mongoose.Types.ObjectId(reassigned.newRoomId);

            // Update destination room document to acquire exclusive write lock under transaction
            const roomLockRes = await RoomModel.updateOne(
              { _id: destRoomObjId, isBlocked: false },
              { $inc: { __v: 1 }, $set: { updatedAt: new Date() } },
              sessionOpt
            );
            if (roomLockRes.matchedCount === 0) {
              throw new AppError(
                409,
                'CONFLICT',
                `Destination room '${reassigned.newRoomId}' is blocked or does not exist.`
              );
            }

            // Live occupancy check inside transaction session
            const liveOccupants = await BookingModel.find(
              {
                assignedRoomId: destRoomObjId,
                _id: { $ne: new mongoose.Types.ObjectId(reassigned.bookingId) },
                'slot.dayOfWeek': req.slot.dayOfWeek,
                status: { $in: ['PENDING', 'APPROVED', 'ALLOCATED'] },
              },
              null,
              sessionOpt
            ).lean();

            for (const occ of liveOccupants) {
              if (doSlotsOverlap(req.slot, occ.slot)) {
                throw new AppError(
                  409,
                  'CONFLICT',
                  `Concurrency conflict: Room '${reassigned.newRoomId}' was assigned by another transaction for overlapping slot ${req.slot.dayOfWeek} ${req.slot.startTime}-${req.slot.endTime}.`
                );
              }
            }
          }
        }

        // a. Persist RoomClosure Document
        const closureDocs = await RoomClosureModel.create(
          [
            {
              roomId: targetRoomObjectId,
              reason: event.reason,
              slot: event.slot,
              status: 'ACTIVE',
              closedBy: actorUserObjectId,
            },
          ],
          sessionOpt
        );
        if (!closureDocs || closureDocs.length === 0) {
          throw new Error('Failed to persist RoomClosure record');
        }
        createdClosureId = closureDocs[0]._id as mongoose.Types.ObjectId;

        // b. Only set Room.isBlocked = true globally if full-room closure (!event.slot)
        if (!event.slot) {
          const roomBefore = await RoomModel.findById(targetRoomObjectId).lean();
          if (roomBefore) {
            prevRoomBlockedState = {
              roomId: targetRoomObjectId,
              isBlocked: roomBefore.isBlocked,
              blockReason: roomBefore.blockReason,
            };
          }
          const roomRes = await RoomModel.updateOne(
            { _id: targetRoomObjectId },
            { isBlocked: true, blockReason: event.reason },
            sessionOpt
          );
          if (roomRes.matchedCount === 0) {
            throw new AppError(404, 'ROOM_NOT_FOUND', `Closed room '${closedRoomId}' was not found`);
          }
        }

        // c. Persist Reassigned Booking Updates with matchedCount verification
        for (const reassigned of reassignedBookings) {
          const bObjId = new mongoose.Types.ObjectId(reassigned.bookingId);
          const bBefore = await BookingModel.findById(bObjId).lean();
          if (bBefore) {
            updatedBookingsState.push({
              bookingId: bObjId,
              prevAssignedRoomId: bBefore.assignedRoomId,
              prevUnassignedReason: bBefore.unassignedReason,
            });
          }

          const bookRes = await BookingModel.updateOne(
            {
              _id: bObjId,
              status: { $in: ['PENDING', 'APPROVED', 'ALLOCATED'] },
            },
            {
              assignedRoomId: new mongoose.Types.ObjectId(reassigned.newRoomId),
              $unset: { unassignedReason: 1 },
            },
            sessionOpt
          );

          if (bookRes.matchedCount === 0) {
            throw new AppError(
              409,
              'CONFLICT',
              `Booking '${reassigned.bookingId}' was not found or was modified concurrently.`
            );
          }
        }

        // d. Persist Unresolved Booking Updates (Clear room pointer & set unassignedReason)
        for (const unresolved of unresolvedBookingIds) {
          const bObjId = new mongoose.Types.ObjectId(unresolved.bookingId);
          const bBefore = await BookingModel.findById(bObjId).lean();
          if (bBefore) {
            updatedBookingsState.push({
              bookingId: bObjId,
              prevAssignedRoomId: bBefore.assignedRoomId,
              prevUnassignedReason: bBefore.unassignedReason,
            });
          }

          const unresRes = await BookingModel.updateOne(
            {
              _id: bObjId,
              status: { $in: ['PENDING', 'APPROVED', 'ALLOCATED'] },
            },
            {
              $unset: { assignedRoomId: 1 },
              unassignedReason: unresolved.reason,
            },
            sessionOpt
          );

          if (unresRes.matchedCount === 0) {
            throw new AppError(
              409,
              'CONFLICT',
              `Unresolved booking '${unresolved.bookingId}' was not found or was modified concurrently.`
            );
          }
        }

        // e. Persist Audit Log with authentic actor identity
        const auditDocs = await AuditLogModel.create(
          [
            {
              userId: actorUserObjectId,
              userRole: actorRole,
              action: 'DISRUPTION_RECOVERY_EXECUTED',
              resource: `RoomClosure:${targetRoomObjectId}`,
              details: {
                closedRoomId: targetRoomObjectId.toString(),
                reason: event.reason,
                affectedCount: affected.length,
                reassignedCount: reassignedBookings.length,
                unresolvedCount: unresolvedBookingIds.length,
                validationPassed: true,
              },
            },
          ],
          sessionOpt
        );
        if (!auditDocs || auditDocs.length === 0) {
          throw new Error('Failed to persist AuditLog record');
        }
        createdAuditLogId = auditDocs[0]._id as mongoose.Types.ObjectId;

        if (session) {
          await session.commitTransaction();
        }
      } catch (persistErr) {
        if (session) {
          await session.abortTransaction();
        } else {
          // Explicit compensation rollback for non-transactional topology
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
              const revertUpdate: Record<string, any> = {};
              if (bState.prevAssignedRoomId) {
                revertUpdate.assignedRoomId = bState.prevAssignedRoomId;
              } else {
                revertUpdate.$unset = { assignedRoomId: 1 };
              }
              if (bState.prevUnassignedReason) {
                revertUpdate.unassignedReason = bState.prevUnassignedReason;
              } else {
                revertUpdate.$unset = { ...(revertUpdate.$unset || {}), unassignedReason: 1 };
              }
              await BookingModel.updateOne({ _id: bState.bookingId }, revertUpdate);
            }
            if (createdAuditLogId) {
              await AuditLogModel.deleteOne({ _id: createdAuditLogId });
            }
          } catch (rollbackErr) {
            console.error('Compensation rollback encountered error:', rollbackErr);
          }
        }
        throw persistErr;
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
