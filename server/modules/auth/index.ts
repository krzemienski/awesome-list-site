/**
 * ============================================================================
 * AUTH MODULE - Authentication & Authorization
 * ============================================================================
 *
 * This module handles all authentication and authorization functionality
 * including user sessions, permissions, and access control.
 *
 * FEATURES:
 * - Local authentication with password hashing
 * - Replit OAuth integration
 * - Session management with secure tokens
 * - Role-based access control (RBAC)
 * - Permission validation middleware
 *
 * SECURITY:
 * - bcrypt password hashing with salt rounds
 * - HTTP-only secure session cookies
 * - CSRF protection for state-changing operations
 * - Rate limiting on authentication endpoints
 * - Account lockout after failed attempts
 *
 * AUTHENTICATION FLOW:
 * 1. User submits credentials via /api/auth/login
 * 2. Validate credentials against database
 * 3. Create session and return secure cookie
 * 4. Subsequent requests include session cookie
 * 5. Middleware validates session on protected routes
 *
 * AUTHORIZATION:
 * - Role hierarchy: admin > moderator > user > guest
 * - Resource-level permissions for granular control
 * - Permission checks in route middleware
 *
 * See /docs/ADMIN-GUIDE.md for authentication setup documentation.
 * ============================================================================
 */

export { authModule } from './routes';
