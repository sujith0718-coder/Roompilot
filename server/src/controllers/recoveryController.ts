import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { recoveryService } from '../services/recovery/index.js';
import { ApiSuccess, DisruptionEvent, RecoveryReport } from '../../../shared/types/index.js';
import { AppError } from '../middleware/errorHandler.js';

const closeRoomSchema = z.object({
  roomId: z.string().min(1, 'roomId is required'),
  reason: z.string().min(1, 'Closure reason is required'),
  slot: z
    .object({
      dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'startTime must be HH:mm format'),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, 'endTime must be HH:mm format'),
      date: z.string().optional(),
    })
    .optional(),
});

export const closeRoomAndRecover = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = closeRoomSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', parseResult.error.errors.map((e) => e.message).join(', '));
    }

    const event: DisruptionEvent = parseResult.data;
    const report: RecoveryReport = await recoveryService.handleRoomClosure(event);

    const response: ApiSuccess<RecoveryReport> = {
      success: true,
      data: report,
      message: `Room closure processed. ${report.reassignedBookings.length} bookings reassigned, ${report.unresolvedBookingIds.length} unresolved.`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
