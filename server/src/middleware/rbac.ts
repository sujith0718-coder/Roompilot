import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../../shared/types/index.js';
import { AppError } from './errorHandler.js';

/**
 * Server-side RBAC middleware.
 * Verifies that the authenticated user's role is in allowedRoles.
 */
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required prior to permission check');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        `Role '${req.user.role}' is not authorized to access this resource`
      );
    }

    next();
  };
};
