/**
 * ============================================================================
 * HEALTH.TS - Health Check Endpoint Handler
 * ============================================================================
 *
 * Provides application health monitoring with database connectivity test.
 * Used by Docker, Kubernetes, and cloud platform health checks.
 *
 * Endpoint: GET /health
 * Response: {
 *   status: 'ok' | 'degraded',
 *   database: 'connected' | 'disconnected',
 *   version: string,
 *   timestamp: ISO8601 string
 * }
 *
 * Status Codes:
 * - 200: Healthy (database connected)
 * - 503: Degraded (database disconnected)
 * ============================================================================
 */

import type { Request, Response } from "express";
import { pool } from "./db/index";

/**
 * Health check handler that tests database connectivity
 */
export async function healthCheck(req: Request, res: Response) {
  const healthStatus = {
    status: 'ok',
    database: 'connected',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };

  try {
    // Test database connectivity with a simple query
    await pool.query('SELECT 1');

    // Database is healthy
    res.status(200).json(healthStatus);
  } catch (error) {
    // Database connection failed
    healthStatus.status = 'degraded';
    healthStatus.database = 'disconnected';

    res.status(503).json(healthStatus);
  }
}
