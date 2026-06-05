/**
 * Integration Tests for the unknown /api/* JSON 404 fallback
 *
 * Guards the behavior added so that unmatched /api/* requests return a JSON 404
 * instead of falling through to Vite's HTML catch-all (which would return a 200
 * with the React app's HTML and mask client routing typos).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '../../../server/routes';

describe('Unknown /api/* route JSON 404 fallback', () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);
  });

  it('returns a JSON 404 for an unknown GET /api/* path', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('message');
  });

  it('returns JSON (not HTML) for an unknown nested /api/* path', async () => {
    const res = await request(app).get('/api/admin/definitely-not-real/123');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body).toBe('object');
    expect(res.text).not.toMatch(/<!DOCTYPE html>/i);
  });

  it('returns a JSON 404 for an unknown POST /api/* path', async () => {
    const res = await request(app).post('/api/does-not-exist').send({});
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
