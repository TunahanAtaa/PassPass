import { describe, it, expect } from 'vitest';
import { generatePassword } from '../utils/password-generator';

describe('Password Generator Utility', () => {
  it('generates a password of default length (16 characters)', () => {
    const password = generatePassword();
    expect(password).toHaveLength(16);
  });

  it('generates passwords of various custom lengths within limits (8 to 64)', () => {
    expect(generatePassword({ length: 8 })).toHaveLength(8);
    expect(generatePassword({ length: 24 })).toHaveLength(24);
    expect(generatePassword({ length: 32 })).toHaveLength(32);
    expect(generatePassword({ length: 64 })).toHaveLength(64);

    // Clamps out-of-bounds lengths
    expect(generatePassword({ length: 4 })).toHaveLength(8);
    expect(generatePassword({ length: 120 })).toHaveLength(64);
  });

  it('contains at least one character from each selected charset', () => {
    // Test multiple times for probabilistic robustness
    for (let i = 0; i < 20; i++) {
      const password = generatePassword({
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      });

      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)).toBe(true);
    }
  });

  it('respects uppercase-only option', () => {
    const password = generatePassword({
      length: 20,
      uppercase: true,
      lowercase: false,
      numbers: false,
      symbols: false,
    });

    expect(/^[A-Z]+$/.test(password)).toBe(true);
  });

  it('respects numbers-only option', () => {
    const password = generatePassword({
      length: 20,
      uppercase: false,
      lowercase: false,
      numbers: true,
      symbols: false,
    });

    expect(/^[0-9]+$/.test(password)).toBe(true);
  });

  it('respects symbols-only option', () => {
    const password = generatePassword({
      length: 20,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: true,
    });

    expect(/^[^a-zA-Z0-9]+$/.test(password)).toBe(true);
  });

  it('falls back to alphanumeric when all charsets are disabled', () => {
    const password = generatePassword({
      length: 16,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
    });

    expect(password).toHaveLength(16);
    expect(/^[a-z0-9]+$/.test(password)).toBe(true);
  });

  it('generates unique random passwords on consecutive calls', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 50; i++) {
      passwords.add(generatePassword({ length: 16 }));
    }
    // 50 randomly generated passwords of 16 chars must all be distinct
    expect(passwords.size).toBe(50);
  });
});
