import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PublicRoute } from '../components/PublicRoute';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextType, UserResponse } from '../types/auth';

const mockUser: UserResponse = {
  id: 'user-uuid',
  email: 'test@passpass.dev',
  is_active: true,
  is_email_verified: false,
  created_at: new Date().toISOString(),
};

const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  token: null,
  vaultToken: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

describe('Route Guards', () => {
  describe('ProtectedRoute', () => {
    it('shows loading indicator while verifying auth session', () => {
      const authValue = createMockAuthContext({ isLoading: true });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Secret Vault</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/verifying secure session/i)).toBeInTheDocument();
      expect(screen.queryByText('Secret Vault')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated user to /login', () => {
      const authValue = createMockAuthContext({ isAuthenticated: false, isLoading: false });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Secret Vault</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div>Login Page Target</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
      expect(screen.queryByText('Secret Vault')).not.toBeInTheDocument();
    });

    it('renders protected child component when user is authenticated', () => {
      const authValue = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
      });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Secret Vault Content</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div>Login Page Target</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Secret Vault Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Page Target')).not.toBeInTheDocument();
    });
  });

  describe('PublicRoute', () => {
    it('renders public guest page when not authenticated', () => {
      const authValue = createMockAuthContext({ isAuthenticated: false, isLoading: false });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <div>Guest Login Page</div>
                  </PublicRoute>
                }
              />
              <Route path="/" element={<div>Dashboard Home</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Guest Login Page')).toBeInTheDocument();
    });

    it('redirects to / when user is already authenticated', () => {
      const authValue = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
      });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <div>Guest Login Page</div>
                  </PublicRoute>
                }
              />
              <Route path="/" element={<div>Dashboard Home Target</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Dashboard Home Target')).toBeInTheDocument();
      expect(screen.queryByText('Guest Login Page')).not.toBeInTheDocument();
    });
  });
});
