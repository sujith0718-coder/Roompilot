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

/**
 * Resource-scoped authorization middleware.
 * Verifies that the authenticated user either owns the requested resource
 * or has an overriding role (e.g. SYSTEM_ADMIN, PRINCIPAL).
 */
export const authorizeResourceScope = (
  getResourceOwnerId: (req: Request) => string | undefined,
  ...overrideRoles: UserRole[]
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required prior to permission check');
    }

    // Role-based override
    if (overrideRoles.includes(req.user.role)) {
      return next();
    }

    const ownerId = getResourceOwnerId(req);
    if (ownerId && req.user.id === ownerId) {
      return next();
    }

    throw new AppError(
      403,
      'FORBIDDEN',
      `User ${req.user.id} (${req.user.role}) is not authorized to access or modify this resource`
    );
  };
};

