import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { ALL_USER_ROLES, UserRole } from '../../../shared/types/index.js';

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

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.id !== 'string' ||
      typeof decoded.email !== 'string' ||
      !ALL_USER_ROLES.includes(decoded.role as UserRole)
    ) {
      throw new Error('Invalid authentication claims');
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as UserRole,
      ...(typeof decoded.department === 'string' ? { department: decoded.department } : {}),
    };
    next();
  } catch (_err) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token verification failed or expired');
  }
};
