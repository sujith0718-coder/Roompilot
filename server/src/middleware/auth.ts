import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { UserRole } from '../../../shared/types/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  department?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication token missing or invalid');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (_err) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token verification failed or expired');
  }
};
