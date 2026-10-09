import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BookingModel, AuditLogModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiSuccess, BookingRequest, BookingStatus, UserRole } from '../../../shared/types/index.js';

function toBookingDTO(doc: any): BookingRequest {
  return {
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
    unassignedReason: doc.unassignedReason,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  };
}

export const getBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { status, dayOfWeek, department, date } = req.query;
    const filter: Record<string, unknown> = {};

    // 1. Role-based scoping
    if (['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER'].includes(user.role)) {
      filter.$or = [
        { requesterId: new mongoose.Types.ObjectId(user.id) },
        ...(user.department ? [{ department: user.department }] : []),
      ];
    } else if (user.role === 'HOD') {
      if (user.department) {
        filter.department = user.department;
      }
    }
    // COE, PRINCIPAL, SYSTEM_ADMIN can see institution-wide bookings

    // 2. Query param filters
    if (status) {
      filter.status = String(status).toUpperCase();
    }
    if (dayOfWeek) {
      filter['slot.dayOfWeek'] = String(dayOfWeek).toUpperCase();
    }
    if (date) {
      filter['slot.date'] = String(date);
    }
    if (department && !filter.department) {
      filter.department = String(department);
    }

    const docs = await BookingModel.find(filter).sort({ createdAt: -1 });
    const bookings = docs.map(toBookingDTO);

    const response: ApiSuccess<BookingRequest[]> = {
      success: true,
      data: bookings,
      message: `Retrieved ${bookings.length} booking request(s)`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'INVALID_ID', `Invalid booking ID format: '${id}'`);
    }

    const doc = await BookingModel.findById(id);
    if (!doc) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking request '${id}' does not exist`);
    }

    // Role-based scope enforcement
    if (['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER'].includes(user.role)) {
      const isOwner = doc.requesterId.toString() === user.id;
      const isSameDept = user.department && doc.department === user.department;
      if (!isOwner && !isSameDept) {
        throw new AppError(403, 'FORBIDDEN', 'Access denied to this booking request');
      }
    } else if (user.role === 'HOD') {
      if (user.department && doc.department && doc.department !== user.department) {
        throw new AppError(403, 'FORBIDDEN', 'HOD can only view bookings within their department');
      }
    }

    const response: ApiSuccess<BookingRequest> = {
      success: true,
      data: toBookingDTO(doc),
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { title, enrollmentCount, requiredFacilities, slot, department } = req.body;

    // RBAC Specific request constraints per matrix
    if (user.role === 'STUDENT_REP' && !title.toLowerCase().includes('class')) {
      // Representative is restricted to class events
      // Allow if valid, or flag context
    }

    const targetDept = department || user.department;

    const newBooking = await BookingModel.create({
      title,
      requesterId: new mongoose.Types.ObjectId(user.id),
      requesterRole: user.role,
      department: targetDept,
      enrollmentCount,
      requiredFacilities: requiredFacilities || [],
      slot,
      status: 'PENDING',
    });

    await AuditLogModel.create({
      userId: user.id,
      userRole: user.role,
      action: 'CREATE_BOOKING',
      resource: `Booking:${newBooking._id}`,
      details: { title: newBooking.title, slot: newBooking.slot },
    });

    const response: ApiSuccess<BookingRequest> = {
      success: true,
      data: toBookingDTO(newBooking),
      message: `Booking request '${newBooking.title}' created successfully`,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { id } = req.params;
    const { status, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'INVALID_ID', `Invalid booking ID format: '${id}'`);
    }

    const doc = await BookingModel.findById(id);
    if (!doc) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking request '${id}' does not exist`);
    }

    // Role permission check for approvals
    if (user.role === 'HOD') {
      if (user.department && doc.department && doc.department !== user.department) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'HOD can only approve or reject bookings within their department'
        );
      }
    } else if (user.role === 'SECRETARY') {
      if (!['EVENT_MANAGER', 'STUDENT_REP'].includes(doc.requesterRole)) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'SECRETARY can only approve club or student association requests'
        );
      }
    } else if (user.role === 'COE') {
      if (doc.requesterRole !== 'COE' && !doc.title.toLowerCase().includes('exam')) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'COE can only approve examination hall bookings'
        );
      }
    }

    doc.status = status as BookingStatus;
    if (status === 'REJECTED' && reason) {
      doc.unassignedReason = reason;
    }
    await doc.save();

    await AuditLogModel.create({
      userId: user.id,
      userRole: user.role,
      action: `BOOKING_STATUS_${status}`,
      resource: `Booking:${doc._id}`,
      details: { previousStatus: doc.status, newStatus: status, reason },
    });

    const response: ApiSuccess<BookingRequest> = {
      success: true,
      data: toBookingDTO(doc),
      message: `Booking request '${doc.title}' status updated to ${status}`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
