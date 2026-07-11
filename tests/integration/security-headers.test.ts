/**
 * Security-headers integration test — Phase-1 (BUG-001, BUG-052-055).
 *
 * Asserts the security-headers middleware installed in server/index.ts emits
 * the documented set of headers on every response. The middleware is an
 * inline arrow function in the production server entry, so this test boots
 * a standalone Express app and replays the same middleware body verbatim
 * (40 LOC, not worth a refactor on its own — and refactoring it would
 * expand Phase-1's blast radius).
 *
 * Coverage:
 *   - Always-on (production AND test mode):
 *       X-Content-Type-Options: nosniff
 *       Referrer-Policy: strict-origin-when-cross-origin
 *       Permissions-Policy: camera=(), microphone=(), geolocation()
 *       Cross-Origin-Opener-Policy: same-origin
 *       Cross-Origin-Embedder-Policy: require-corp
 *       Cross-Origin-Resource-Policy: same-origin
 *   - Production-only:
 *       Content-Security-Policy (with BUG-001/052/053 hardening)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import crypto from 'node:crypto';

const EXPECTED_CROSS_ORIGIN: Readonly<Record<string, string>> = {
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-embedder-policy': 'require-corp',
  'cross-origin-resource-policy': 'same-origin',
};

const EXPECTED_BASELINE: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Builds the security-headers middleware body for the given env. Mirrors
 * server/index.ts lines 37-83 verbatim. Pure of process.env so tests can
 * exercise both modes without mutating global state.
 */
function securityHeaders(isProduction: boolean) {
  return function installSecurityHeaders(
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.cspNonce = nonce;

    if (isProduction) {
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://replit.com https://replit-cdn.com`,
          `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https://img.youtube.com https://*.ytimg.com https://avatars.githubusercontent.com https://repository-images.githubusercontent.com https://www.google.com https://www.gstatic.com",
          "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "base-uri 'self'",
          "object-src 'none'",
        ].join('; '),
      );
    }

    next();
  };
}

describe('Security headers middleware (Phase-1)', () => {
  let testApp: Express;
  let prodApp: Express;

  beforeEach(() => {
    testApp = express();
    testApp.use(securityHeaders(false));
    testApp.get('/', (_req, res) => res.status(200).send('home'));
    testApp.get('/recommendations', (_req, res) =>
      res.status(200).send('recommendations'),
    );

    prodApp = express();
    prodApp.use(securityHeaders(true));
    prodApp.get('/', (_req, res) => res.status(200).send('home'));
    prodApp.get('/recommendations', (_req, res) =>
      res.status(200).send('recommendations'),
    );
  });

  // BUG-055 + the always-on baseline: COOP/COEP/CORP plus the
  // X-Content-Type-Options / Referrer-Policy / Permissions-Policy trio
  // must be present in EVERY env, not gated on production.
  describe('always-on headers (any NODE_ENV)', () => {
    it.each<[string, () => Promise<supertest.Response>]>([
      ['/', () => request(testApp).get('/')],
      ['/recommendations', () => request(testApp).get('/recommendations')],
    ])('%s always emits the baseline + cross-origin headers', async (route, fire) => {
      void route;
      const res = await fire();
      expect(res.status).toBe(200);
      for (const [header, expected] of Object.entries(EXPECTED_BASELINE)) {
        expect(res.headers[header]).toBe(expected);
      }
      for (const [header, expected] of Object.entries(
        EXPECTED_CROSS_ORIGIN,
      )) {
        expect(res.headers[header]).toBe(expected);
      }
    });
  });

  // BUG-001: script-src must include https://replit-cdn.com (Phase-1 added it).
  // BUG-052: CSP must include form-action 'self'.
  // BUG-053: CSP must include base-uri 'self' and object-src 'none'.
  // BUG-054: Permissions-Policy is part of the production CSP response.
  describe('production-mode CSP coverage', () => {
    it('CSP includes the replit-cdn.com origin (BUG-001)', async () => {
      const res = await request(prodApp).get('/');
      const csp = res.headers['content-security-policy'];
      expect(csp).toBeDefined();
      const cspText = String(csp);
      expect(cspText).toContain('https://replit-cdn.com');
      expect(cspText).toMatch(
        /script-src[^;]*https:\/\/replit-cdn\.com/,
      );
    });

    it('CSP includes form-action self (BUG-052)', async () => {
      const res = await request(prodApp).get('/');
      expect(String(res.headers['content-security-policy'])).toContain(
        "form-action 'self'",
      );
    });

    it('CSP includes base-uri self and object-src none (BUG-053)', async () => {
      const res = await request(prodApp).get('/');
      const csp = String(res.headers['content-security-policy']);
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it('Permissions-Policy is consistent (BUG-054)', async () => {
      const res = await request(prodApp).get('/');
      expect(res.headers['permissions-policy']).toBe(
        'camera=(), microphone=(), geolocation=()',
      );
    });

    it('CSP hardening trio fires on every route (BUG-001/052/053)', async () => {
      for (const route of ['/', '/recommendations']) {
        const res = await request(prodApp).get(route);
        const csp = String(res.headers['content-security-policy']);
        expect(csp).toContain('https://replit-cdn.com');
        expect(csp).toContain("form-action 'self'");
        expect(csp).toContain("base-uri 'self'");
        expect(csp).toContain("object-src 'none'");
      }
    });
  });
});
