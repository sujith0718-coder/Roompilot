import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { authenticate } from '../../src/middleware/auth.js';
import { authorizeRoles } from '../../src/middleware/rbac.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { testTokens, expiredToken, forgedToken } from '../helpers/testTokens.js';
import { ALL_USER_ROLES, UserRole } from '../../../shared/types/index.js';

describe('API Integration — Authentication & Role-Based Access Control (RBAC)', () => {
  let testApp: Express;

  beforeAll(() => {
    testApp = express();
    testApp.use(express.json());

    // 1. Authenticated Profile / Session route
    testApp.get('/api/v1/auth/me', authenticate, (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        data: req.user,
        timestamp: new Date().toISOString(),
      });
    });

    // 2. Admin-only Route (Manage Rooms / System Config)
    testApp.post(
      '/api/v1/rooms',
      authenticate,
      authorizeRoles('SYSTEM_ADMIN'),
      (_req: Request, res: Response) => {
        res.status(201).json({ success: true, message: 'Room created successfully' });
      }
    );

    // 3. Class-Test Booking Route (TUTOR, HOD, PRINCIPAL, SYSTEM_ADMIN)
    testApp.post(
      '/api/v1/bookings/class-test',
      authenticate,
      authorizeRoles('TUTOR', 'HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true, message: 'Class-test booking registered' });
      }
    );

    // 4. Club Event Approval Route (SECRETARY, PRINCIPAL, SYSTEM_ADMIN)
    testApp.patch(
      '/api/v1/bookings/club/approve',
      authenticate,
      authorizeRoles('SECRETARY', 'PRINCIPAL', 'SYSTEM_ADMIN'),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true, message: 'Club booking approved' });
      }
    );

    // 5. Allocation Engine Execution Route (HOD, COE, PRINCIPAL, SYSTEM_ADMIN)
    testApp.post(
      '/api/v1/allocation/run',
      authenticate,
      authorizeRoles('HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true, message: 'Allocation execution triggered' });
      }
    );

    // 6. Disruption Trigger Route (HOD, PRINCIPAL, SYSTEM_ADMIN)
    testApp.post(
      '/api/v1/recovery/close-room',
      authenticate,
      authorizeRoles('HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true, message: 'Room closure initiated' });
      }
    );

    // 7. Audit Trail Logs Route (PRINCIPAL, SYSTEM_ADMIN)
    testApp.get(
      '/api/v1/audit-logs',
      authenticate,
      authorizeRoles('PRINCIPAL', 'SYSTEM_ADMIN'),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true, message: 'Audit logs retrieved' });
      }
    );

    // Central Error Handler
    testApp.use(errorHandler);
  });

  describe('Authentication Middleware (server/src/middleware/auth)', () => {
    it('rejects requests without an Authorization header with 401 UNAUTHORIZED', async () => {
      const res = await request(testApp).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Authentication token missing or invalid');
    });

    it('rejects requests with malformed header (not Bearer format) with 401 UNAUTHORIZED', async () => {
      const res = await request(testApp)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic my-token-credentials');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with an invalid / forged signature with 401 INVALID_TOKEN', async () => {
      const res = await request(testApp)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
      expect(res.body.error.message).toContain('Token verification failed or expired');
    });

    it('rejects requests with an expired token with 401 INVALID_TOKEN', async () => {
      const res = await request(testApp)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('accepts valid tokens and decodes user context onto req.user', async () => {
      const res = await request(testApp)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testTokens.TUTOR}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('TUTOR');
      expect(res.body.data.email).toBe('tutor@campus.test');
    });
  });

  describe('Role-Based Access Control Middleware (server/src/middleware/rbac)', () => {
    it('SYSTEM_ADMIN is authorized for system config/room creation (201)', async () => {
      const res = await request(testApp)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${testTokens.SYSTEM_ADMIN}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('non-admin roles are forbidden (403 FORBIDDEN) from system config/room creation', async () => {
      const nonAdminRoles: UserRole[] = [
        'TUTOR',
        'STUDENT_REP',
        'EVENT_MANAGER',
        'SECRETARY',
        'HOD',
        'COE',
        'PRINCIPAL',
      ];

      for (const role of nonAdminRoles) {
        const res = await request(testApp)
          .post('/api/v1/rooms')
          .set('Authorization', `Bearer ${testTokens[role]}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('FORBIDDEN');
        expect(res.body.error.message).toContain(`Role '${role}' is not authorized to access this resource`);
      }
    });

    it('Class-Test booking respects RBAC permissions: TUTOR, HOD, PRINCIPAL, SYSTEM_ADMIN allowed', async () => {
      const allowedRoles: UserRole[] = ['TUTOR', 'HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'];
      for (const role of allowedRoles) {
        const res = await request(testApp)
          .post('/api/v1/bookings/class-test')
          .set('Authorization', `Bearer ${testTokens[role]}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }

      const deniedRoles: UserRole[] = ['STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'COE'];
      for (const role of deniedRoles) {
        const res = await request(testApp)
          .post('/api/v1/bookings/class-test')
          .set('Authorization', `Bearer ${testTokens[role]}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('Disruption room closure trigger allows HOD, PRINCIPAL, SYSTEM_ADMIN, and denies TUTOR, STUDENT_REP, COE', async () => {
      const allowed: UserRole[] = ['HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'];
      for (const role of allowed) {
        const res = await request(testApp)
          .post('/api/v1/recovery/close-room')
          .set('Authorization', `Bearer ${testTokens[role]}`);
        expect(res.status).toBe(200);
      }

      const denied: UserRole[] = ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'COE'];
      for (const role of denied) {
        const res = await request(testApp)
          .post('/api/v1/recovery/close-room')
          .set('Authorization', `Bearer ${testTokens[role]}`);
        expect(res.status).toBe(403);
      }
    });

    it('Audit trail logs route strictly restricts access to PRINCIPAL and SYSTEM_ADMIN only', async () => {
      const allowed: UserRole[] = ['PRINCIPAL', 'SYSTEM_ADMIN'];
      for (const role of allowed) {
        const res = await request(testApp)
          .get('/api/v1/audit-logs')
          .set('Authorization', `Bearer ${testTokens[role]}`);
        expect(res.status).toBe(200);
      }

      const denied: UserRole[] = ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE'];
      for (const role of denied) {
        const res = await request(testApp)
          .get('/api/v1/audit-logs')
          .set('Authorization', `Bearer ${testTokens[role]}`);
        expect(res.status).toBe(403);
      }
    });

    it('Direct API calls attempting to bypass authorization without token are blocked (401)', async () => {
      // Direct call bypass attempt
      const res = await request(testApp).post('/api/v1/allocation/run');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
