import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { UserRole } from '../../../shared/types/index.js';
import { AuthenticatedUser } from '../../src/middleware/auth.js';

/**
 * TEST TOKEN GENERATION UTILITY
 * Produces deterministic, safe JWT tokens for backend RBAC and authentication tests.
 * Uses valid 24-character hex ObjectIds for MongoDB compliance.
 * NEVER USE IN PRODUCTION.
 */

const roleHexMap: Record<UserRole, string> = {
  TUTOR: '507f1f77bcf86cd799439001',
  STUDENT_REP: '507f1f77bcf86cd799439002',
  EVENT_MANAGER: '507f1f77bcf86cd799439003',
  SECRETARY: '507f1f77bcf86cd799439004',
  HOD: '507f1f77bcf86cd799439005',
  COE: '507f1f77bcf86cd799439006',
  PRINCIPAL: '507f1f77bcf86cd799439007',
  SYSTEM_ADMIN: '507f1f77bcf86cd799439008',
};

export const generateTestToken = (
  role: UserRole,
  overrides?: Partial<AuthenticatedUser>,
  expiresIn: string | number = '1h'
): string => {
  const payload: AuthenticatedUser = {
    id: overrides?.id || roleHexMap[role] || '507f1f77bcf86cd799439099',
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
    id: '507f1f77bcf86cd799439098',
    email: 'expired@campus.test',
    role: 'TUTOR',
  },
  env.JWT_SECRET,
  { expiresIn: -10 }
);

export const forgedToken = jwt.sign(
  {
    id: '507f1f77bcf86cd799439097',
    email: 'forged@campus.test',
    role: 'SYSTEM_ADMIN',
  },
  'wrong_secret_key_used_to_forge_signature'
);
