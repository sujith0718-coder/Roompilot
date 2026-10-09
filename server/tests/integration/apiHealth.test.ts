import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('API Integration — Health & Diagnostics Route', () => {
  it('GET /api/v1/health returns 200 and standard ApiSuccess envelope', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('timestamp');

    const healthData = res.body.data;
    expect(healthData).toHaveProperty('status', 'UP');
    expect(healthData).toHaveProperty('dbStatus');
    expect(typeof healthData.uptime).toBe('number');
    expect(res.body.message).toBe('RoomWise Backend Service Operational');
  });

  it('GET /api/v1/non-existent returns 404 NOT_FOUND within standard ApiError envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-endpoint');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message', 'Requested API endpoint does not exist');
    expect(res.body.timestamp).toBeDefined();
  });
});
