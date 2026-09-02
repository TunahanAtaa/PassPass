/**
 * AuthContext & Provider
 *
 * Centralized authentication state management for PassPass.
 * Manages user lifecycle, token persistence, initialization checks,
 * and login/register/logout actions.
 */

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import { tokenStorage } from '../utils/token-storage';
import type {
  AuthContextType,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '../types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStorage.getAccessToken());
  const [vaultToken, setVaultToken] = useState<string | null>(() => tokenStorage.getVaultToken());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify existing session on application start / page refresh
  const initializeAuth = useCallback(async () => {
    const existingAccessToken = tokenStorage.getAccessToken();

    if (!existingAccessToken) {
      setIsLoading(false);
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    try {
      const userProfile = await authService.getMe();
      setUser(userProfile);
      setToken(existingAccessToken);
      setVaultToken(tokenStorage.getVaultToken());
      setIsAuthenticated(true);
    } catch {
      // Token is expired or invalid -> wipe storage and reset state
      tokenStorage.clearTokens();
      setUser(null);
      setToken(null);
      setVaultToken(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const tokenResponse = await authService.login(credentials);
      
      // Store tokens in persistent storage
      tokenStorage.setTokens(tokenResponse.access_token, tokenResponse.vault_token);
      setToken(tokenResponse.access_token);
      setVaultToken(tokenResponse.vault_token);

      // Fetch user profile
      const userProfile = await authService.getMe();
      setUser(userProfile);
      setIsAuthenticated(true);
    } catch (error) {
      tokenStorage.clearTokens();
      setUser(null);
      setToken(null);
      setVaultToken(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterRequest): Promise<UserResponse> => {
    return authService.register(credentials);
  }, []);

  const logout = useCallback((): void => {
    tokenStorage.clearTokens();
    setUser(null);
    setToken(null);
    setVaultToken(null);
    setIsAuthenticated(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!tokenStorage.hasAccessToken()) return;
    try {
      const userProfile = await authService.getMe();
      setUser(userProfile);
    } catch {
      logout();
    }
  }, [logout]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    token,
    vaultToken,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }), [user, token, vaultToken, isAuthenticated, isLoading, login, register, logout, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
