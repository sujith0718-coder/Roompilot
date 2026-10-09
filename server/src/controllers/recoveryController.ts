import { Request, Response, NextFunction } from 'express';
import { recoveryService } from '../services/recovery/index.js';
import { reassignDisruptionSchema } from '../middleware/validationSchemas.js';
import {
  ApiSuccess,
  RecoveryReport,
  DisruptionEvent,
} from '../../../shared/types/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const reassignDisruptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedBody = reassignDisruptionSchema.parse(req.body);
    const event = validatedBody.event as DisruptionEvent;

    const user = (req as any).user;
    if (!user || !user.id || !user.role) {
      throw new AppError(
        401,
        'UNAUTHORIZED',
        'Authentication context with valid user identity and role is required'
      );
    }

    const report: RecoveryReport = await recoveryService.handleRoomClosure(event, {
      actor: {
        id: String(user.id),
        role: user.role,
      },
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
