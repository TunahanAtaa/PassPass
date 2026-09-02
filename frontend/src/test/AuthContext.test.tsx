import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth.service';
import { tokenStorage } from '../utils/token-storage';
import type { UserResponse, TokenResponse } from '../types/auth';

vi.mock('../services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    getMe: vi.fn(),
  },
}));

const mockUser: UserResponse = {
  id: 'user-uuid-1234',
  email: 'test@passpass.dev',
  is_active: true,
  is_email_verified: false,
  created_at: new Date().toISOString(),
};

const mockTokens: TokenResponse = {
  access_token: 'jwt.mock.token',
  token_type: 'bearer',
  vault_token: 'vault.mock.token.uuid',
};

// Helper component to display and interact with auth state
const TestConsumer = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Idle'}</div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Unauthenticated'}</div>
      <div data-testid="user-email">{user ? user.email : 'No User'}</div>
      <button onClick={() => login({ email: 'test@passpass.dev', password: 'Password1' })}>
        Trigger Login
      </button>
      <button onClick={logout}>Trigger Logout</button>
    </div>
  );
};

describe('AuthContext & State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes as unauthenticated when no token is in storage', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Idle');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
    });
  });

  it('restores authentication session on mount if token is stored', async () => {
    tokenStorage.setTokens('existing-jwt', 'existing-vault-token');
    vi.mocked(authService.getMe).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Idle');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@passpass.dev');
    });

    expect(authService.getMe).toHaveBeenCalled();
  });

  it('clears storage and resets state if stored token is expired/invalid (401)', async () => {
    tokenStorage.setTokens('expired-jwt', 'expired-vault');
    vi.mocked(authService.getMe).mockRejectedValueOnce(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Idle');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
    });

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getVaultToken()).toBeNull();
  });

  it('logs in user, saves tokens in localStorage, and updates auth state', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockResolvedValueOnce(mockTokens);
    vi.mocked(authService.getMe).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Idle'));

    await user.click(screen.getByRole('button', { name: /trigger login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@passpass.dev');
    });

    expect(tokenStorage.getAccessToken()).toBe('jwt.mock.token');
    expect(tokenStorage.getVaultToken()).toBe('vault.mock.token.uuid');
  });

  it('logs out user, clears localStorage, and resets state', async () => {
    const user = userEvent.setup();
    tokenStorage.setTokens('active-jwt', 'active-vault');
    vi.mocked(authService.getMe).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated'));

    await user.click(screen.getByRole('button', { name: /trigger logout/i }));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getVaultToken()).toBeNull();
  });
});
