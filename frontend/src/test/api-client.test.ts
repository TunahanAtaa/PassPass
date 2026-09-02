import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, extractErrorMessage, ApiError } from '../lib/api-client';
import { tokenStorage } from '../utils/token-storage';

describe('API Client & Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('extractErrorMessage', () => {
    it('extracts string detail message from FastAPI error response', () => {
      const errorData = { detail: 'Invalid credentials' };
      const { message } = extractErrorMessage(errorData, 401);
      expect(message).toBe('Invalid credentials');
    });

    it('extracts and formats Pydantic validation errors from FastAPI 422 response', () => {
      const errorData = {
        detail: [
          { loc: ['body', 'password'], msg: 'Value error, Password must contain at least one digit', type: 'value_error' },
          { loc: ['body', 'email'], msg: 'Value error, Invalid email format', type: 'value_error' },
        ],
      };
      const { message } = extractErrorMessage(errorData, 422);
      expect(message).toBe('Password must contain at least one digit. Invalid email format');
    });

    it('falls back to status-based message when detail is missing', () => {
      const { message: msg401 } = extractErrorMessage({}, 401);
      expect(msg401).toBe('Invalid credentials or session expired');

      const { message: msg409 } = extractErrorMessage(null, 409);
      expect(msg409).toBe('A user with this email already exists');
    });
  });

  describe('apiClient fetch behavior', () => {
    it('automatically attaches Bearer and X-Vault-Token headers when available', async () => {
      tokenStorage.setTokens('mock-jwt-token', 'mock-vault-token');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await apiClient<{ success: boolean }>('/test-endpoint');

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8000/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
            'X-Vault-Token': 'mock-vault-token',
          }),
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('throws ApiError with status and formatted message on HTTP error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Email already registered' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      let thrownError: unknown;
      try {
        await apiClient('/api/v1/auth/register', { method: 'POST' });
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(ApiError);
      expect(thrownError).toMatchObject({
        status: 409,
        message: 'Email already registered',
      });
    });
  });
});
