import bcrypt from 'bcryptjs';
import { visibleLength, passwordVisibleCheck } from '@shared/validation';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function validateEmail(email: string): boolean {
  // BUG-035 (run14): cap length at the RFC 5321 practical maximum (254) —
  // unbounded emails otherwise reach bcrypt-adjacent paths and the DB verbatim.
  if (email.length > 254) {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// BUG-016 (run13): reject the most common breached passwords outright.
// Comparison is case-insensitive; this is a small, high-yield blocklist —
// not a substitute for the length rule, an addition to it.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd', 'p@ssword', 'p@ssw0rd',
  '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop',
  'iloveyou', 'sunshine', 'princess', 'football', 'baseball', 'superman',
  'welcome1', 'admin123', 'letmein1', 'trustno1', 'dragon123', 'monkey123',
  'abc12345', '11111111', '00000000', 'aaaaaaaa', 'asdfghjkl', 'zaq12wsx',
  '1q2w3e4r', 'qazwsxedc', 'password!', 'changeme', 'whatever',
]);

/**
 * R5-031: fold a candidate to its canonical skeleton before the denylist
 * lookup. NFKC maps fullwidth/mathematical/compat confusables onto their
 * plain forms (ｐａｓｓｗｏｒｄ, 𝐩assword, passworｄ → password) and format
 * characters (zero-widths, bidi marks) are stripped so "pass\u200Bword123"
 * can't sneak past. Folding is for the CHECK only — the stored hash is
 * always of the exact string the user typed.
 */
function foldForDenylist(password: string): string {
  let folded: string;
  try {
    folded = password.normalize('NFKC');
  } catch {
    folded = password;
  }
  return folded.replace(/[\p{Cf}\p{Cs}]/gu, '').toLowerCase();
}

/**
 * Rules for NEW passwords (register / change-password / reset). Login paths
 * must NOT call this — existing credentials predate newer rules and would be
 * locked out. Use validateLoginPassword there instead.
 *
 * - ≥8 chars and ≥8 VISIBLE chars (R4-014/R5-001: bidi overrides, blank
 *   glyphs, combining-mark-only runs don't count),
 * - ≤72 BYTES (R5-046: bcrypt silently truncates at 72 bytes — a "128-char"
 *   cap let multi-byte passwords be quietly cut mid-character),
 * - not on the common-password denylist after NFKC confusable folding (R5-031).
 */
export function validateNewPassword(password: string): { valid: boolean; error?: string } {
  const base = passwordVisibleCheck(password ?? '');
  if (!base.valid) {
    return base;
  }
  if (COMMON_PASSWORDS.has(foldForDenylist(password))) {
    return { valid: false, error: 'That password is too common — please choose something harder to guess' };
  }
  return { valid: true };
}

/**
 * Login-path sanity check ONLY: type + generous length bounds. Deliberately
 * loose — tightening it retroactively locks out users whose stored passwords
 * were valid under older rules. bcrypt cost is bounded by the length cap.
 */
export function validateLoginPassword(password: unknown): boolean {
  return typeof password === 'string' && password.length >= 1 && password.length <= 1024;
}

/** @deprecated alias for validateNewPassword — new-credential paths only. */
export const validatePassword = validateNewPassword;

export { visibleLength };
