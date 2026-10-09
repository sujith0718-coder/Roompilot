import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { UserRole } from '../../../shared/types/index.js';
import { AuthenticatedUser } from '../../src/middleware/auth.js';

/**
 * TEST TOKEN GENERATION UTILITY
 * Produces deterministic, safe JWT tokens for backend RBAC and authentication tests.
 * NEVER USE IN PRODUCTION.
 */

export const generateTestToken = (
  role: UserRole,
  overrides?: Partial<AuthenticatedUser>,
  expiresIn: string | number = '1h'
): string => {
  const payload: AuthenticatedUser = {
    id: overrides?.id || `test-${role.toLowerCase()}-id`,
    email: overrides?.email || `${role.toLowerCase()}@campus.test`,
    role,
    department: overrides?.department || 'Computer Science',
  };

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
};

export const testTokens: Record<UserRole, string> = {
  TUTOR: generateTestToken('TUTOR'),
  STUDENT_REP: generateTestToken('STUDENT_REP'),
  EVENT_MANAGER: generateTestToken('EVENT_MANAGER'),
  SECRETARY: generateTestToken('SECRETARY'),
  HOD: generateTestToken('HOD'),
  COE: generateTestToken('COE'),
  PRINCIPAL: generateTestToken('PRINCIPAL'),
  SYSTEM_ADMIN: generateTestToken('SYSTEM_ADMIN'),
};

export const expiredToken = jwt.sign(
  {
    id: 'test-expired-user',
    email: 'expired@campus.test',
    role: 'TUTOR',
  },
  env.JWT_SECRET,
  { expiresIn: -10 }
);

export const forgedToken = jwt.sign(
  {
    id: 'test-forged-user',
    email: 'forged@campus.test',
    role: 'SYSTEM_ADMIN',
  },
  'wrong_secret_key_used_to_forge_signature'
);
