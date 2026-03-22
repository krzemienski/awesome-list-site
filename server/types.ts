/**
 * Type augmentations for Express
 */
import type { SessionUser } from "./replitAuth";

declare global {
  namespace Express {
    // Augment Express.User to match our SessionUser type
    interface User extends SessionUser {}
  }
}

export {};
