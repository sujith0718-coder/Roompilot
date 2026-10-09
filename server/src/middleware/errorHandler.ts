import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../../shared/types/index.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = err instanceof AppError ? err.details : undefined;

  const response: ApiError = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  };

  if (statusCode === 500) {
    console.error('💥 Unhandled Exception:', err);
  }

  res.status(statusCode).json(response);
};
