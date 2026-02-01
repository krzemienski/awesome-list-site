/**
 * ============================================================================
 * ROUTES INDEX - Central Route Module Registry
 * ============================================================================
 *
 * This module exports all route registration functions for easy import
 * and consistent route setup across the application.
 *
 * Usage:
 *   import {
 *     registerAuthRoutes,
 *     registerSeoRoutes,
 *     registerResourceRoutes,
 *     registerCategoryRoutes,
 *     registerAdminRoutes,
 *     registerGitHubRoutes,
 *     registerClaudeRoutes,
 *     bookmarksRouter,
 *     favoritesRouter,
 *     journeysRouter,
 *     isAdmin
 *   } from './routes';
 *
 *   registerAuthRoutes(app);
 *   registerSeoRoutes(app);
 *   registerResourceRoutes(app);
 *   registerCategoryRoutes(app);
 *   registerAdminRoutes(app);
 *   registerGitHubRoutes(app, isAuthenticated, isAdmin);
 *   registerClaudeRoutes(app, isAuthenticated, isAdmin);
 *   app.use('/api/bookmarks', bookmarksRouter);
 *   app.use('/api/favorites', favoritesRouter);
 *   app.use('/api/journeys', journeysRouter);
 * ============================================================================
 */

// Route registration functions
export { registerAuthRoutes, isAdmin } from './auth';
export { registerSeoRoutes } from './seo';
export { registerResourceRoutes } from './resources';
export { registerCategoryRoutes } from './categories';
export { registerAdminRoutes } from './admin/index';
export { registerGitHubRoutes } from './github';
export { registerClaudeRoutes } from './claude';

// Express Router instances (to be mounted with app.use)
export { default as bookmarksRouter } from './bookmarks';
export { default as favoritesRouter } from './favorites';
export { default as journeysRouter } from './journeys';
