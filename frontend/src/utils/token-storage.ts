/**
 * Token Storage Utility
 *
 * Centralizes localStorage access for access_token (JWT) and vault_token (Vault Session).
 */

const ACCESS_TOKEN_KEY = 'passpass_access_token';
const VAULT_TOKEN_KEY = 'passpass_vault_token';

export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to save access token in localStorage', e);
    }
  },

  getVaultToken(): string | null {
    try {
      return localStorage.getItem(VAULT_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setVaultToken(token: string): void {
    try {
      localStorage.setItem(VAULT_TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to save vault token in localStorage', e);
    }
  },

  setTokens(accessToken: string, vaultToken: string): void {
    this.setAccessToken(accessToken);
    this.setVaultToken(vaultToken);
  },

  clearTokens(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(VAULT_TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to clear tokens from localStorage', e);
    }
  },

  hasAccessToken(): boolean {
    return Boolean(this.getAccessToken());
  },
};
