import { Request, Response, NextFunction } from 'express';
import { recoveryService } from '../services/recovery/index.js';
import { reassignDisruptionSchema } from '../middleware/validationSchemas.js';
import {
  ApiSuccess,
  RecoveryReport,
  DisruptionEvent,
  AllocationAssignment,
  BookingRequest,
  Room,
  RoomClosure,
} from '../../../shared/types/index.js';

export const reassignDisruptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedBody = reassignDisruptionSchema.parse(req.body);

    const event = validatedBody.event as DisruptionEvent;
    const currentAssignments = validatedBody.currentAssignments as AllocationAssignment[] | undefined;
    const requests = validatedBody.requests as BookingRequest[] | undefined;
    const rooms = validatedBody.rooms as Room[] | undefined;
    const closures = validatedBody.closures as RoomClosure[] | undefined;

    const userId = (req as any).user?.id || (req as any).user?._id;
    const userRole = (req as any).user?.role;

    const report: RecoveryReport = await recoveryService.handleRoomClosure(event, {
      currentAssignments,
      requests,
      rooms,
      closures,
      userId,
      userRole,
    });

    const response: ApiSuccess<RecoveryReport> = {
      success: true,
      data: report,
      message: `Disruption recovery completed for room closure '${report.closedRoomId}'. Reassigned: ${report.totalAssignmentsChangedCount}, Unresolved: ${report.unresolvedBookingIds.length}.`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
