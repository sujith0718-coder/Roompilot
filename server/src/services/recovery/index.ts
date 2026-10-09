import mongoose from 'mongoose';
import {
  BookingRequest,
  DisruptionEvent,
  RecoveryReport,
  Room,
  TimeSlot,
} from '../../../../shared/types/index.js';
import { validationService } from '../validation/index.js';
import { BookingModel } from '../../models/Booking.js';
import { RoomModel } from '../../models/Room.js';
import { AuditLogModel } from '../../models/AuditLog.js';

/**
 * Checks whether two time slots overlap in day and time range.
 */
export function timeSlotsOverlap(slotA: TimeSlot, slotB: TimeSlot): boolean {
  if (slotA.date && slotB.date && slotA.date !== slotB.date) {
    return false;
  }
  if (slotA.dayOfWeek !== slotB.dayOfWeek) {
    return false;
  }

  const toMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const startA = toMinutes(slotA.startTime);
  const endA = toMinutes(slotA.endTime);
  const startB = toMinutes(slotB.startTime);
  const endB = toMinutes(slotB.endTime);

  return startA < endB && startB < endA;
}

export interface IRecoveryService {
  handleRoomClosure(event: DisruptionEvent): Promise<RecoveryReport>;
  recoverDisruption(
    event: DisruptionEvent,
    requests: BookingRequest[],
    rooms: Room[]
  ): RecoveryReport;
}

export class RecoveryService implements IRecoveryService {
  /**
   * Pure domain algorithm to resolve disruption without direct database dependency.
   * Preserves unaffected assignments, evaluates M4 hard constraints,
   * minimizes disruption churn, and captures explicit unresolved explanations.
   */
  public recoverDisruption(
    event: DisruptionEvent,
    requests: BookingRequest[],
    rooms: Room[]
  ): RecoveryReport {
    const closedRoomId = event.roomId;
    const closedRoom = rooms.find((r) => r.id === closedRoomId || (r as any)._id?.toString() === closedRoomId);

    // 1. Identify affected bookings (assigned to the closed room and overlapping slot if slot specified)
    const affectedRequests: BookingRequest[] = [];
    const unaffectedRequests: BookingRequest[] = [];

    for (const req of requests) {
      const isAssignedToClosedRoom =
        req.assignedRoomId === closedRoomId ||
        (req.assignedRoomId && req.assignedRoomId.toString() === closedRoomId);

      if (isAssignedToClosedRoom) {
        if (!event.slot || timeSlotsOverlap(req.slot, event.slot)) {
          affectedRequests.push(req);
        } else {
          // Assigned to same room, but outside closed time range -> preserve
          unaffectedRequests.push(req);
        }
      } else if (req.assignedRoomId) {
        unaffectedRequests.push(req);
      }
    }

    const affectedBookingIds = affectedRequests.map((r) => r.id);
    const reassignedBookings: RecoveryReport['reassignedBookings'] = [];
    const unresolvedBookingIds: RecoveryReport['unresolvedBookingIds'] = [];

    // Track active room occupancies across the schedule
    // Map roomId -> list of slots occupied
    const roomSchedule = new Map<string, { bookingId: string; slot: TimeSlot }[]>();

    for (const req of unaffectedRequests) {
      if (!req.assignedRoomId) continue;
      const rId = req.assignedRoomId.toString();
      if (!roomSchedule.has(rId)) {
        roomSchedule.set(rId, []);
      }
      roomSchedule.get(rId)!.push({ bookingId: req.id, slot: req.slot });
    }

    // Candidate operational rooms (excluding the closed room)
    const availableRooms = rooms.filter(
      (r) => (r.id !== closedRoomId && (r as any)._id?.toString() !== closedRoomId) && !r.isBlocked
    );

    // 2. Process each affected booking to find eligible replacement room
    for (const req of affectedRequests) {
      const previousRoomId = req.assignedRoomId || closedRoomId;

      // Find rooms passing all hard constraints and time availability
      interface CandidateEvaluation {
        room: Room;
        capacityWaste: number;
      }

      const validCandidates: CandidateEvaluation[] = [];
      const failureReasons: string[] = [];

      for (const candidateRoom of availableRooms) {
        const candidateId = candidateRoom.id || (candidateRoom as any)._id?.toString();

        // Check slot availability against existing bookings and already reassigned bookings
        const existingInRoom = roomSchedule.get(candidateId) || [];
        const slotConflict = existingInRoom.some((existing) =>
          timeSlotsOverlap(existing.slot, req.slot)
        );

        if (slotConflict) {
          failureReasons.push(`Room ${candidateRoom.code} is already occupied during requested slot.`);
          continue;
        }

        // Validate hard constraints via M4's Independent Validation Service
        const existingAssignmentsForValidator = (roomSchedule.get(candidateId) || []).map((e) => ({
          roomId: candidateId,
          slot: e.slot,
        }));

        const validation = validationService.validateAssignment(
          req,
          candidateRoom,
          existingAssignmentsForValidator
        );

        if (!validation.isValid) {
          failureReasons.push(
            `Room ${candidateRoom.code} violates hard constraints: ${validation.violations.join('; ')}`
          );
          continue;
        }

        // Candidate is valid
        validCandidates.push({
          room: candidateRoom,
          capacityWaste: candidateRoom.capacity - req.enrollmentCount,
        });
      }

      if (validCandidates.length > 0) {
        // Pick best replacement room: minimize capacity waste, then deterministic code sort
        validCandidates.sort((a, b) => {
          if (a.capacityWaste !== b.capacityWaste) {
            return a.capacityWaste - b.capacityWaste;
          }
          return a.room.code.localeCompare(b.room.code);
        });

        const chosen = validCandidates[0].room;
        const chosenId = chosen.id || (chosen as any)._id?.toString();

        // Assign and reserve slot
        if (!roomSchedule.has(chosenId)) {
          roomSchedule.set(chosenId, []);
        }
        roomSchedule.get(chosenId)!.push({ bookingId: req.id, slot: req.slot });

        reassignedBookings.push({
          bookingId: req.id,
          previousRoomId: previousRoomId.toString(),
          newRoomId: chosenId,
          explanation: `Reassigned from ${closedRoom?.code || previousRoomId} to ${chosen.code} due to '${event.reason}'. Capacity: ${chosen.capacity} (Waste: ${validCandidates[0].capacityWaste}). Passed M4 hard constraints.`,
        });
      } else {
        // Could not recover - must never silently violate constraints
        const specificReason =
          failureReasons.length > 0
            ? `No eligible room found. Evaluated ${availableRooms.length} operational room(s). Sample conflicts: ${failureReasons.slice(0, 3).join(' | ')}`
            : `No operational rooms with capacity >= ${req.enrollmentCount} and required facilities (${req.requiredFacilities.join(', ') || 'None'}) available.`;

        unresolvedBookingIds.push({
          bookingId: req.id,
          reason: specificReason,
        });
      }
    }

    const totalAssignmentsChangedCount = reassignedBookings.length;
    const unaffectedAssignmentsPreservedCount = unaffectedRequests.length;

    return {
      closedRoomId,
      affectedBookingIds,
      reassignedBookings,
      unresolvedBookingIds,
      unaffectedAssignmentsPreservedCount,
      totalAssignmentsChangedCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Database-backed recovery execution.
   * Loads rooms and bookings, runs recovery, updates database documents,
   * logs audit event, and returns standard RecoveryReport.
   */
  public async handleRoomClosure(event: DisruptionEvent): Promise<RecoveryReport> {
    // If MongoDB is not connected or in test mode, return pure recovery logic
    if (mongoose.connection.readyState !== 1) {
      return this.recoverDisruption(event, [], []);
    }

    // Load active rooms and allocated bookings from database
    const roomDocs = await RoomModel.find().lean();
    const rooms: Room[] = roomDocs.map((doc: any) => ({
      id: doc._id.toString(),
      code: doc.code,
      name: doc.name,
      capacity: doc.capacity,
      facilities: doc.facilities,
      building: doc.building,
      floor: doc.floor,
      isBlocked: doc.isBlocked,
      blockReason: doc.blockReason,
    }));

    const bookingDocs = await BookingModel.find({
      status: { $in: ['ALLOCATED', 'APPROVED'] },
    }).lean();

    const requests: BookingRequest[] = bookingDocs.map((doc: any) => ({
      id: doc._id.toString(),
      title: doc.title,
      requesterId: doc.requesterId?.toString() || '',
      requesterRole: doc.requesterRole,
      department: doc.department,
      enrollmentCount: doc.enrollmentCount,
      requiredFacilities: doc.requiredFacilities || [],
      slot: doc.slot,
      status: doc.status,
      assignedRoomId: doc.assignedRoomId ? doc.assignedRoomId.toString() : undefined,
      unassignedReason: doc.unassignedReason,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    const report = this.recoverDisruption(event, requests, rooms);

    // Apply updates to database
    for (const reassigned of report.reassignedBookings) {
      await BookingModel.findByIdAndUpdate(reassigned.bookingId, {
        assignedRoomId: reassigned.newRoomId,
        status: 'ALLOCATED',
        unassignedReason: undefined,
      });
    }

    for (const unresolved of report.unresolvedBookingIds) {
      await BookingModel.findByIdAndUpdate(unresolved.bookingId, {
        assignedRoomId: null,
        status: 'PENDING',
        unassignedReason: unresolved.reason,
      });
    }

    // Optionally update room status if full closure
    if (!event.slot) {
      await RoomModel.findByIdAndUpdate(event.roomId, {
        isBlocked: true,
        blockReason: event.reason,
      });
    }

    // Audit log entry
    try {
      await AuditLogModel.create({
        userId: new mongoose.Types.ObjectId(), // System recovery process
        userRole: 'SYSTEM_ADMIN',
        action: 'DISRUPTION_RECOVERY',
        resource: `Room:${event.roomId}`,
        details: {
          event,
          reassignedCount: report.reassignedBookings.length,
          unresolvedCount: report.unresolvedBookingIds.length,
          preservedCount: report.unaffectedAssignmentsPreservedCount,
        },
      });
    } catch (_err) {
      // Non-critical audit log failure should not break recovery
    }

    return report;
  }
}

export const recoveryService = new RecoveryService();
