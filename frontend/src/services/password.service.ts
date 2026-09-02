/**
 * Password Vault API Service
 *
 * Handles CRUD operations for AES-256-GCM encrypted vault entries.
 * Interacts with FastAPI /api/v1/passwords endpoints.
 */

import { apiClient } from '../lib/api-client';
import type {
  PasswordCreateRequest,
  PasswordListResponse,
  PasswordResponse,
  PasswordUpdateRequest,
} from '../types/password';

export const passwordService = {
  /**
   * Retrieves all password items for the authenticated user (metadata only, no plaintext passwords).
   */
  async listPasswords(): Promise<PasswordListResponse> {
    return apiClient<PasswordListResponse>('/api/v1/passwords');
  },

  /**
   * Retrieves a single password entry with decrypted password and notes.
   */
  async getPassword(id: string): Promise<PasswordResponse> {
    return apiClient<PasswordResponse>(`/api/v1/passwords/${id}`);
  },

  /**
   * Creates a new password entry. Backend encrypts sensitive fields before storage.
   */
  async createPassword(data: PasswordCreateRequest): Promise<PasswordResponse> {
    return apiClient<PasswordResponse>('/api/v1/passwords', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Updates an existing password entry. Backend re-encrypts sensitive fields.
   */
  async updatePassword(id: string, data: PasswordUpdateRequest): Promise<PasswordResponse> {
    return apiClient<PasswordResponse>(`/api/v1/passwords/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deletes a password entry from the user's vault.
   */
  async deletePassword(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/passwords/${id}`, {
      method: 'DELETE',
    });
  },
};
