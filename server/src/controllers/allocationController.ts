import { Request, Response, NextFunction } from 'express';
import { allocationService } from '../services/allocation/index.js';
import { runAllocationSchema } from '../middleware/validationSchemas.js';
import {
  ApiSuccess,
  AllocationResult,
  AllocationMethod,
  BookingRequest,
  Room,
  RoomClosure,
} from '../../../shared/types/index.js';

export const runAllocationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedBody = runAllocationSchema.parse(req.body);

    const method = validatedBody.method as AllocationMethod;
    const requests = validatedBody.requests as BookingRequest[] | undefined;
    const rooms = validatedBody.rooms as Room[] | undefined;
    const closures = validatedBody.closures as RoomClosure[] | undefined;

    const userId = (req as any).user?.id || (req as any).user?._id;

    const result: AllocationResult = await allocationService.runAllocation(
      requests,
      rooms,
      method,
      { closures, userId }
    );

    const response: ApiSuccess<AllocationResult> = {
      success: true,
      data: result,
      message: `Allocation run executed successfully using ${result.method} method.`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
