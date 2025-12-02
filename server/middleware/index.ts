/**
 * Middleware Module
 *
 * Express middleware for:
 * - HTTP response caching with ETag
 * - Cache-Control headers
 * - Stale-while-revalidate support
 * - Request context tracking for audit logging
 *
 * Usage:
 * ```typescript
 * import { cachePresets, cacheMiddleware, invalidateRelatedCaches } from './middleware';
 *
 * // Use preset
 * app.get('/api/categories', cachePresets.categories, handler);
 *
 * // Custom config
 * app.get('/api/custom', cacheMiddleware({ ttl: 300, includeQuery: true }), handler);
 *
 * // Request context for audit logging
 * import { requestContextMiddleware, getAuditContext } from './middleware';
 * app.use(requestContextMiddleware);
 *
 * // In route handler:
 * const auditCtx = getAuditContext(req);
 * await storage.logResourceAudit(resourceId, 'action', userId, changes, notes, auditCtx);
 * ```
 */

export {
  cacheMiddleware,
  cachePresets,
  invalidateRelatedCaches,
  setBrowserCacheHeaders,
} from './cacheMiddleware';

export {
  requestContextMiddleware,
  getAuditContext,
  createSystemAuditContext,
} from './requestContext';
