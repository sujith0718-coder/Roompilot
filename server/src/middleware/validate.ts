import { Request, Response, NextFunction } from 'express';
import { Schema } from 'zod';
import { AppError } from './errorHandler.js';

export const validateBody = (schema: Schema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request body payload', result.error.format());
    }
    req.body = result.data;
    next();
  };
};
