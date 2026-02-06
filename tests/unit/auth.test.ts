/**
 * Unit Tests for Authentication Utilities
 *
 * Tests the password and authentication utilities including:
 * - Password hashing and comparison
 * - Email validation
 * - Password validation
 * - Local authentication strategy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, comparePassword, validateEmail, validatePassword } from '../../server/passwordUtils';

describe('Password Utilities - hashPassword', () => {
  it('should hash a password', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should produce different hashes for same password', async () => {
    const password = 'TestPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });

  it('should hash different passwords to different values', async () => {
    const password1 = 'TestPassword123';
    const password2 = 'DifferentPassword456';

    const hash1 = await hashPassword(password1);
    const hash2 = await hashPassword(password2);

    expect(hash1).not.toBe(hash2);
  });

  it('should hash empty string', async () => {
    const hash = await hashPassword('');

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should hash long passwords', async () => {
    const longPassword = 'a'.repeat(1000);
    const hash = await hashPassword(longPassword);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should hash passwords with special characters', async () => {
    const password = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });
});

describe('Password Utilities - comparePassword', () => {
  it('should return true for matching password and hash', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);

    const result = await comparePassword(password, hash);

    expect(result).toBe(true);
  });

  it('should return false for non-matching password and hash', async () => {
    const password = 'TestPassword123';
    const wrongPassword = 'WrongPassword456';
    const hash = await hashPassword(password);

    const result = await comparePassword(wrongPassword, hash);

    expect(result).toBe(false);
  });

  it('should be case sensitive', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);

    const result = await comparePassword('testpassword123', hash);

    expect(result).toBe(false);
  });

  it('should return false for empty password against hash', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);

    const result = await comparePassword('', hash);

    expect(result).toBe(false);
  });

  it('should handle special characters in password comparison', async () => {
    const password = 'P@ssw0rd!#$%^&*()';
    const hash = await hashPassword(password);

    const result = await comparePassword(password, hash);

    expect(result).toBe(true);
  });

  it('should return false for invalid hash format', async () => {
    const password = 'TestPassword123';
    const invalidHash = 'not-a-valid-hash';

    const result = await comparePassword(password, invalidHash);

    expect(result).toBe(false);
  });
});

describe('Email Validation - validateEmail', () => {
  it('should validate correct email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user_name@example-domain.com',
      'test123@test.io',
      'a@b.co',
    ];

    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'invalid',
      'invalid@',
      '@example.com',
      'invalid@.com',
      'invalid@domain',
      'invalid @example.com',
      'invalid@exam ple.com',
      '',
      'invalid@',
      '@domain.com',
      'user@.com',
      'user@domain.',
    ];

    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  it('should reject emails without @ symbol', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('should reject emails without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('should reject emails without username', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  it('should reject emails with spaces', () => {
    expect(validateEmail('user name@example.com')).toBe(false);
    expect(validateEmail('user@exam ple.com')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('should reject emails with multiple @ symbols', () => {
    expect(validateEmail('user@@example.com')).toBe(false);
    expect(validateEmail('user@domain@example.com')).toBe(false);
  });
});

describe('Password Validation - validatePassword', () => {
  it('should validate passwords with 8 or more characters', () => {
    const validPasswords = [
      'Password',
      'Pass1234',
      'P@ssw0rd',
      'a'.repeat(8),
      'LongPassword123456',
    ];

    validPasswords.forEach(password => {
      const result = validatePassword(password);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should reject passwords shorter than 8 characters', () => {
    const invalidPasswords = [
      'Pass123',
      'a'.repeat(7),
      'Short',
      '1234567',
      'Pwd',
    ];

    invalidPasswords.forEach(password => {
      const result = validatePassword(password);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });
  });

  it('should reject empty password', () => {
    const result = validatePassword('');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters long');
  });

  it('should reject undefined password', () => {
    const result = validatePassword(undefined as any);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters long');
  });

  it('should reject null password', () => {
    const result = validatePassword(null as any);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters long');
  });

  it('should accept exactly 8 characters', () => {
    const result = validatePassword('12345678');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept very long passwords', () => {
    const longPassword = 'a'.repeat(1000);
    const result = validatePassword(longPassword);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept passwords with special characters', () => {
    const password = 'P@ssw0rd!#$%';
    const result = validatePassword(password);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept passwords with spaces if length is valid', () => {
    const password = 'Pass word 123';
    const result = validatePassword(password);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('Password Utilities - Integration Tests', () => {
  it('should validate password and then hash it successfully', async () => {
    const password = 'ValidPass123';

    const validation = validatePassword(password);
    expect(validation.valid).toBe(true);

    const hash = await hashPassword(password);
    expect(hash).toBeDefined();

    const matches = await comparePassword(password, hash);
    expect(matches).toBe(true);
  });

  it('should reject invalid password before hashing', () => {
    const password = 'short';

    const validation = validatePassword(password);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBeDefined();
  });

  it('should validate email and password together for registration', () => {
    const email = 'user@example.com';
    const password = 'SecurePass123';

    const emailValid = validateEmail(email);
    const passwordValidation = validatePassword(password);

    expect(emailValid).toBe(true);
    expect(passwordValidation.valid).toBe(true);
  });

  it('should reject invalid email and password combination', () => {
    const email = 'invalid-email';
    const password = 'short';

    const emailValid = validateEmail(email);
    const passwordValidation = validatePassword(password);

    expect(emailValid).toBe(false);
    expect(passwordValidation.valid).toBe(false);
  });

  it('should handle complete auth flow validation', async () => {
    const email = 'test@example.com';
    const password = 'SecurePassword123';

    const emailValid = validateEmail(email);
    expect(emailValid).toBe(true);

    const passwordValidation = validatePassword(password);
    expect(passwordValidation.valid).toBe(true);

    const hash = await hashPassword(password);
    const passwordMatch = await comparePassword(password, hash);
    expect(passwordMatch).toBe(true);

    const wrongPasswordMatch = await comparePassword('WrongPassword', hash);
    expect(wrongPasswordMatch).toBe(false);
  });
});
