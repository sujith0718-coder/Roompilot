import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import express, { Request, Response } from 'express';
import app from '../app.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles, authorizeResourceScope } from '../middleware/rbac.js';
import { errorHandler } from '../middleware/errorHandler.js';

test('M1: Platform, Authentication, RBAC and Session Suite', async (t) => {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const makeValidToken = (role: string, id = '507f1f77bcf86cd799439011', email = 'admin@campus.edu') => {
    return jwt.sign({ id, email, role, department: 'IT Administration' }, env.JWT_SECRET, { expiresIn: '1h' });
  };

  t.after(() => {
    server.close();
  });

  await t.test('POST /auth/login: rejects malformed email with 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.timestamp);
  });

  await t.test('POST /auth/login: rejects unregistered non-demo email with 401 INVALID_CREDENTIALS', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost.user@unknown-domain.com', password: 'randomPassword123' }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('POST /auth/login: rejects incorrect password for demo account with 401 INVALID_CREDENTIALS', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@campus.edu', password: 'WrongPassword@999' }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('POST /auth/login: successfully authenticates with valid demo credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@campus.edu', password: 'DemoPass2026!' }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.ok(body.data.token, 'JWT token must be present');
    assert.equal(body.data.user.email, 'admin@campus.edu');
    assert.equal(body.data.user.role, 'SYSTEM_ADMIN');
    assert.equal(body.data.user.passwordHash, undefined, 'passwordHash must never be leaked');

    // Verify generated JWT token payload and signature
    const decoded = jwt.verify(body.data.token, env.JWT_SECRET) as any;
    assert.equal(decoded.email, 'admin@campus.edu');
    assert.equal(decoded.role, 'SYSTEM_ADMIN');
  });

  await t.test('GET /auth/me: rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    assert.equal(res.status, 401);

    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  await t.test('GET /auth/me: rejects forged / tampered token with 401 INVALID_TOKEN', async () => {
    const forgedToken = jwt.sign({ id: '123', role: 'SYSTEM_ADMIN' }, 'wrong_secret_attacker_key');
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_TOKEN');
  });

  await t.test('GET /auth/me: returns current user data when authenticated with valid token', async () => {
    const validToken = makeValidToken('HOD', 'usr_hod_1', 'hod.cs@campus.edu');
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, 'hod.cs@campus.edu');
    assert.equal(body.data.user.role, 'HOD');
  });

  await t.test('POST /auth/logout: returns 200 acknowledging session termination', async () => {
    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.ok(body.message.includes('terminated'));
  });

  await t.test('Resource-scoped authorization middleware: tests owner access vs foreign user', async () => {
    // Setup isolated test sub-app with resource-scoped authorization route
    const testApp = express();
    testApp.use(express.json());

    testApp.get(
      '/resource/:ownerId',
      authenticate,
      authorizeResourceScope((req: Request) => req.params.ownerId, 'SYSTEM_ADMIN', 'PRINCIPAL'),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true, message: 'Resource accessed' });
      }
    );
    testApp.use(errorHandler);

    const testServer = testApp.listen(0);
    const testPort = (testServer.address() as AddressInfo).port;
    const testUrl = `http://127.0.0.1:${testPort}`;

    try {
      const ownerToken = makeValidToken('TUTOR', 'user_owner_100', 'owner@campus.edu');
      const otherUserToken = makeValidToken('STUDENT_REP', 'user_other_200', 'other@campus.edu');
      const adminToken = makeValidToken('SYSTEM_ADMIN', 'user_admin_300', 'admin@campus.edu');

      // 1. Owner can access their resource
      const ownerRes = await fetch(`${testUrl}/resource/user_owner_100`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(ownerRes.status, 200);

      // 2. Non-owner without override role is denied (403 FORBIDDEN)
      const foreignRes = await fetch(`${testUrl}/resource/user_owner_100`, {
        headers: { Authorization: `Bearer ${otherUserToken}` },
      });
      assert.equal(foreignRes.status, 403);
      const foreignBody = (await foreignRes.json()) as any;
      assert.equal(foreignBody.error.code, 'FORBIDDEN');

      // 3. Admin with override role can access other users' resource
      const adminRes = await fetch(`${testUrl}/resource/user_owner_100`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminRes.status, 200);
    } finally {
      testServer.close();
    }
  });
});
