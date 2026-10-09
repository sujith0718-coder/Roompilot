import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validationService } from '../services/validation/index.js';
import { BookingModel, RoomModel, RoomClosureModel } from '../models/index.js';
import {
  ApiSuccess,
  HardConstraintValidationResult,
  BookingRequest,
  Room,
  RoomClosure,
} from '../../../shared/types/index.js';

export const validateProposedAllocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { assignments, requests: inlineRequests, rooms: inlineRooms, closures: inlineClosures } = req.body as {
      assignments: { bookingId: string; roomId: string; explanation?: string }[];
      requests?: BookingRequest[];
      rooms?: Room[];
      closures?: RoomClosure[];
    };

    let requests: BookingRequest[] = inlineRequests || [];
    let rooms: Room[] = inlineRooms || [];
    let closures: RoomClosure[] = inlineClosures || [];

    // If database is connected and inline data is not provided, query MongoDB
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!inlineRequests && isDbConnected) {
      const bookingIds = assignments.map((a) => a.bookingId);
      const validBookingObjectIds = bookingIds.filter((id) => mongoose.isValidObjectId(id));
      const bookingDocs = await BookingModel.find({ _id: { $in: validBookingObjectIds } });

      requests = bookingDocs.map((doc) => ({
        id: doc._id.toString(),
        title: doc.title,
        requesterId: doc.requesterId.toString(),
        requesterRole: doc.requesterRole,
        department: doc.department,
        enrollmentCount: doc.enrollmentCount,
        requiredFacilities: doc.requiredFacilities,
        slot: {
          dayOfWeek: doc.slot.dayOfWeek,
          startTime: doc.slot.startTime,
          endTime: doc.slot.endTime,
          date: doc.slot.date,
        },
        status: doc.status,
        assignedRoomId: doc.assignedRoomId ? doc.assignedRoomId.toString() : undefined,
        createdAt: doc.createdAt.toISOString(),
      }));
    }

    if (!inlineRooms && isDbConnected) {
      const roomIds = assignments.map((a) => a.roomId);
      const validRoomObjectIds = roomIds.filter((id) => mongoose.isValidObjectId(id));
      const roomDocs = await RoomModel.find({
        $or: [
          { _id: { $in: validRoomObjectIds } },
          { code: { $in: roomIds.map((r) => r.toUpperCase()) } },
        ],
      });

      rooms = roomDocs.map((doc) => ({
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
    }

    if (!inlineClosures && isDbConnected) {
      const activeClosureDocs = await RoomClosureModel.find({ status: 'ACTIVE' });
      closures = activeClosureDocs.map((doc) => ({
        id: doc._id.toString(),
        roomId: doc.roomId.toString(),
        reason: doc.reason,
        status: doc.status,
        slot: doc.slot,
        createdAt: doc.createdAt.toISOString(),
      }));
    }

    // Run independent hard-constraint evaluation
    const result: HardConstraintValidationResult = validationService.validateAllocation(
      assignments.map((a) => ({
        bookingId: a.bookingId,
        roomId: a.roomId,
        explanation: a.explanation || 'Proposed assignment',
      })),
      requests,
      rooms,
      closures
    );

    const response: ApiSuccess<HardConstraintValidationResult> = {
      success: true,
      data: result,
      message: result.isValid
        ? 'Allocation satisfies all hard constraints'
        : `Allocation failed hard-constraint validation with ${result.violations.length} violation(s)`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
