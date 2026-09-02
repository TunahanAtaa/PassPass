import { describe, it, expect } from 'vitest';
import { calculatePasswordStrength } from '../utils/password-strength';

describe('Password Strength Evaluator', () => {
  it('returns Zayıf for empty or short passwords', () => {
    const emptyResult = calculatePasswordStrength('');
    expect(emptyResult.level).toBe('Zayıf');
    expect(emptyResult.percentage).toBe(0);

    const shortResult = calculatePasswordStrength('12345');
    expect(shortResult.level).toBe('Zayıf');
    expect(shortResult.percentage).toBeLessThanOrEqual(33);
  });

  it('evaluates simple lowercase passwords as Zayıf', () => {
    const result = calculatePasswordStrength('password');
    expect(result.level).toBe('Zayıf');
    expect(result.color).toBe('#ef4444');
  });

  it('evaluates mixed alphanumeric passwords of moderate length as Orta', () => {
    const result = calculatePasswordStrength('Password123');
    expect(result.level).toBe('Orta');
    expect(result.percentage).toBe(66);
    expect(result.color).toBe('#f59e0b');
  });

  it('evaluates long, diverse passwords with symbols as Güçlü', () => {
    const result = calculatePasswordStrength('k!9P#vL8$zQ2@mX4');
    expect(result.level).toBe('Güçlü');
    expect(result.percentage).toBe(100);
    expect(result.color).toBe('#22c55e');
  });

  it('provides actionable feedback message in Turkish', () => {
    const weak = calculatePasswordStrength('abc');
    expect(weak.feedback).toMatch(/zayıf/i);

    const medium = calculatePasswordStrength('SecurePass1');
    expect(medium.feedback).toMatch(/orta/i);

    const strong = calculatePasswordStrength('V3ry$tr0ng!P@ssw0rd');
    expect(strong.feedback).toMatch(/güçlü/i);
  });
});
