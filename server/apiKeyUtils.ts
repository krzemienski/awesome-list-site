import { randomBytes, createHash } from "crypto";

/**
 * API Key Utilities
 *
 * API keys are high-entropy random tokens (256 bits). Because authentication
 * needs an O(1) equality lookup against the stored value, keys are stored as a
 * deterministic SHA-256 hash (NOT bcrypt — bcrypt is salted/non-deterministic
 * and cannot be looked up by equality). With 256 bits of entropy in the raw key,
 * SHA-256 is safe: there is nothing to brute-force and rainbow tables are moot.
 *
 * The plaintext key is shown to the user exactly once at creation time; only the
 * hash is ever persisted.
 */

const API_KEY_PREFIX = "av_";

/**
 * Generate a new plaintext API key. Only returned to the caller once.
 * @returns A prefixed, high-entropy plaintext key (e.g. "av_9f3c...").
 */
export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(32).toString("hex");
}

/**
 * Hash a raw API key for storage / lookup.
 * @param rawKey - The plaintext API key.
 * @returns Hex-encoded SHA-256 digest of the raw key.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
