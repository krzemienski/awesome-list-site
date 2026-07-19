import bcrypt from 'bcryptjs';
import { visibleLength } from '@shared/validation';

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

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  // NB-001 (run18) + R4-014 (run21): reject passwords with fewer than 8
  // VISIBLE characters. `.trim()` only strips \s — zero-width characters
  // (U+200B etc.) slipped through and produced invisible passwords.
  if (visibleLength(password) < 8) {
    return { valid: false, error: 'Password must contain at least 8 visible characters' };
  }
  // BUG-015 (run13): cap length — bcrypt truncates at 72 bytes and unbounded
  // input is a cheap DoS vector for the hashing path.
  if (password.length > 128) {
    return { valid: false, error: 'Password must be at most 128 characters long' };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'That password is too common — please choose something harder to guess' };
  }
  return { valid: true };
}
