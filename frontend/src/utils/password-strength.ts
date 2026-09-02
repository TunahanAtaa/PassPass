/**
 * Password Strength Evaluator (Şifre Gücü Hesaplayıcı)
 *
 * Calculates password complexity and entropy based on length,
 * character diversity, and structure. Returns Turkish localized levels and feedback.
 */

export type PasswordStrengthLevel = 'Zayıf' | 'Orta' | 'Güçlü';

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  score: number;        // 0 to 4
  percentage: number;   // 0 to 100
  color: string;        // Hex / CSS color
  feedback: string;     // Helpful Turkish suggestion
}

/**
 * Evaluates the strength of a given password string.
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      level: 'Zayıf',
      score: 0,
      percentage: 0,
      color: '#6b7280',
      feedback: 'Bir parola girin',
    };
  }

  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const diversityCount = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  let rawPoints = 0;

  // Length scoring
  if (length >= 8) rawPoints += 1;
  if (length >= 12) rawPoints += 2;
  if (length >= 16) rawPoints += 1;

  // Character diversity scoring
  if (diversityCount >= 2) rawPoints += 1;
  if (diversityCount >= 3) rawPoints += 1;
  if (diversityCount === 4) rawPoints += 1;

  // Penalty for very short passwords regardless of diversity
  if (length < 8) {
    rawPoints = Math.min(rawPoints, 1);
  }

  // 3 Tiers: Zayıf (0-2), Orta (3-4), Güçlü (5+)
  if (rawPoints >= 5) {
    return {
      level: 'Güçlü',
      score: 4,
      percentage: 100,
      color: '#22c55e', // green-500
      feedback: 'Yüksek güvenlikli güçlü parola',
    };
  }

  if (rawPoints >= 3) {
    return {
      level: 'Orta',
      score: 2,
      percentage: 66,
      color: '#f59e0b', // amber-500
      feedback: 'Orta seviye güvenlik, sembol veya uzunluk ekleyebilirsiniz',
    };
  }

  return {
    level: 'Zayıf',
    score: 1,
    percentage: 33,
    color: '#ef4444', // red-500
    feedback: 'Zayıf: En az 8 karakter, harf, rakam ve sembol kullanın',
  };
}
