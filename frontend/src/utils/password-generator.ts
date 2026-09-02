/**
 * Cryptographically Secure Password Generator
 *
 * Generates random passwords using the Browser Web Crypto API (crypto.getRandomValues).
 * Never uses Math.random() to ensure cryptographically secure entropy.
 */

export interface PasswordGeneratorOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

export type GeneratorOptions = Required<PasswordGeneratorOptions>;

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Gets a cryptographically random integer in the range [0, max - 1].
 * Avoids modulo bias using rejection sampling.
 */
function getSecureRandomInt(max: number): number {
  if (max <= 0) return 0;
  if (max === 1) return 0;

  // Maximum power of 2 <= 2^32 that is a multiple of max
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % max);

  const array = new Uint32Array(1);
  let randomVal: number;

  do {
    crypto.getRandomValues(array);
    randomVal = array[0];
  } while (randomVal >= limit);

  return randomVal % max;
}

/**
 * Shuffles an array of characters in-place using the Fisher-Yates algorithm
 * with cryptographically secure random values.
 */
function secureShuffle(array: string[]): string[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates a strong, customizable password using cryptographically secure random values.
 *
 * @param options - Configuration options for character sets and length.
 * @returns A cryptographically secure random password string.
 */
export function generatePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  const validLength = Math.max(8, Math.min(64, length));

  // Build character pools
  const activePools: string[] = [];
  let fullCharPool = '';

  if (uppercase) {
    activePools.push(CHARSETS.uppercase);
    fullCharPool += CHARSETS.uppercase;
  }
  if (lowercase) {
    activePools.push(CHARSETS.lowercase);
    fullCharPool += CHARSETS.lowercase;
  }
  if (numbers) {
    activePools.push(CHARSETS.numbers);
    fullCharPool += CHARSETS.numbers;
  }
  if (symbols) {
    activePools.push(CHARSETS.symbols);
    fullCharPool += CHARSETS.symbols;
  }

  // If no charsets were selected, fallback to alphanumeric
  if (activePools.length === 0) {
    activePools.push(CHARSETS.lowercase, CHARSETS.numbers);
    fullCharPool = CHARSETS.lowercase + CHARSETS.numbers;
  }

  const resultChars: string[] = [];

  // Guarantee at least one character from each selected charset
  for (const pool of activePools) {
    const randIndex = getSecureRandomInt(pool.length);
    resultChars.push(pool[randIndex]);
  }

  // Fill the remaining length from the combined pool
  const remainingCount = validLength - resultChars.length;
  for (let i = 0; i < remainingCount; i++) {
    const randIndex = getSecureRandomInt(fullCharPool.length);
    resultChars.push(fullCharPool[randIndex]);
  }

  // Securely shuffle the generated array to eliminate predictable prefix ordering
  return secureShuffle(resultChars).join('');
}
