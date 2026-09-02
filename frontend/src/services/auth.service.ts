/**
 * Authentication Service
 *
 * Interacts with FastAPI /api/v1/auth endpoints:
 * - register: POST /api/v1/auth/register
 * - login: POST /api/v1/auth/login
 * - getMe: GET /api/v1/auth/me
 */

import { apiClient } from '../lib/api-client';
import type { LoginRequest, RegisterRequest, TokenResponse, UserResponse } from '../types/auth';

export const authService = {
  /**
   * Registers a new user with email and password.
   */
  async register(data: RegisterRequest): Promise<UserResponse> {
    return apiClient<UserResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
      skipVaultAuth: true,
    });
  },

  /**
   * Authenticates user credentials and retrieves JWT access token + vault session token.
   */
  async login(data: LoginRequest): Promise<TokenResponse> {
    return apiClient<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
      skipVaultAuth: true,
    });
  },

  /**
   * Fetches profile of currently authenticated user using Bearer token.
   */
  async getMe(): Promise<UserResponse> {
    return apiClient<UserResponse>('/api/v1/auth/me', {
      method: 'GET',
    });
  },
};
