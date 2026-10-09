import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../../src/middleware/validate.js';
import { errorHandler, AppError } from '../../src/middleware/errorHandler.js';

describe('API Integration — Validation Middleware & Central Error Handling', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const testSchema = z.object({
      name: z.string().min(2),
      capacity: z.number().int().positive(),
    });

    app.post('/test/validation', validateBody(testSchema), (req: Request, res: Response) => {
      res.status(200).json({ success: true, data: req.body });
    });

    app.get('/test/app-error', (_req: Request, _res: Response) => {
      throw new AppError(409, 'CONFLICT_ERROR', 'State conflict encountered', { entityId: 'room-1' });
    });

    app.get('/test/unhandled-error', (_req: Request, _res: Response) => {
      throw new Error('Database connection unexpectedly dropped');
    });

    app.use(errorHandler);
  });

  describe('Zod validateBody Middleware', () => {
    it('accepts compliant payloads and binds sanitized data to req.body', async () => {
      const res = await request(app)
        .post('/test/validation')
        .send({ name: 'Physics Lab', capacity: 35 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ name: 'Physics Lab', capacity: 35 });
    });

    it('rejects malformed payloads with 400 VALIDATION_ERROR and details', async () => {
      const res = await request(app)
        .post('/test/validation')
        .send({ name: 'P', capacity: -5 }); // name too short, capacity negative

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toBe('Invalid request body payload');
      expect(res.body.error).toHaveProperty('details');
    });

    it('rejects missing required fields', async () => {
      const res = await request(app).post('/test/validation').send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Central Error Handler', () => {
    it('formats AppError instances with correct status, code, details and ApiError envelope', async () => {
      const res = await request(app).get('/test/app-error');

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT_ERROR');
      expect(res.body.error.message).toBe('State conflict encountered');
      expect(res.body.error.details).toEqual({ entityId: 'room-1' });
      expect(res.body.timestamp).toBeDefined();
    });

    it('formats unexpected unhandled errors with 500 INTERNAL_SERVER_ERROR', async () => {
      const res = await request(app).get('/test/unhandled-error');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body.error.message).toBe('Database connection unexpectedly dropped');
      expect(res.body.timestamp).toBeDefined();
    });
  });
});
