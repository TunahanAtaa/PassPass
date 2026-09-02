import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Browser Clipboard API for jsdom
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});
