import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { AuthContext } from '../context/AuthContext';
import { ApiError } from '../lib/api-client';
import type { AuthContextType } from '../types/auth';

const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockRegister = vi.fn();
const mockRefreshUser = vi.fn();

const defaultAuthContextValue: AuthContextType = {
  user: null,
  token: null,
  vaultToken: null,
  isAuthenticated: false,
  isLoading: false,
  login: mockLogin,
  logout: mockLogout,
  register: mockRegister,
  refreshUser: mockRefreshUser,
};

function renderLoginPage(authContextOverrides: Partial<AuthContextType> = {}, initialRoute = '/login') {
  const contextValue: AuthContextType = {
    ...defaultAuthContextValue,
    ...authContextOverrides,
  };

  return render(
    <AuthContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Dashboard Home</div>} />
          <Route path="/register" element={<div>Register Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements correctly in Turkish', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /passpass'e giriş yap/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-posta adresi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ana parola/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^giriş yap$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hesap oluştur/i })).toBeInTheDocument();
  });

  it('shows error if email is missing on submit', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const submitBtn = screen.getByRole('button', { name: /^giriş yap$/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/e-posta adresi zorunludur/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows error if password is empty on submit', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const emailInput = screen.getByLabelText(/e-posta adresi/i);
    await user.type(emailInput, 'test@example.com');

    const submitBtn = screen.getByRole('button', { name: /^giriş yap$/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/parola alanı zorunludur/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with credentials and navigates on success', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);

    renderLoginPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'user@passpass.dev');
    await user.type(screen.getByLabelText(/ana parola/i), 'SecurePass1');
    await user.click(screen.getByRole('button', { name: /^giriş yap$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@passpass.dev',
        password: 'SecurePass1',
      });
      expect(screen.getByText('Dashboard Home')).toBeInTheDocument();
    });
  });

  it('displays user-friendly error when 401 Unauthorized is returned', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new ApiError('Invalid credentials', 401));

    renderLoginPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'user@passpass.dev');
    await user.type(screen.getByLabelText(/ana parola/i), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /^giriş yap$/i }));

    expect(
      await screen.findByText(/geçersiz e-posta veya parola/i)
    ).toBeInTheDocument();
  });

  it('displays network error when connection fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(
      new ApiError('Unable to connect to the backend server. Please check your connection.', 0)
    );

    renderLoginPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'user@passpass.dev');
    await user.type(screen.getByLabelText(/ana parola/i), 'Pass1234');
    await user.click(screen.getByRole('button', { name: /^giriş yap$/i }));

    expect(
      await screen.findByText(/unable to connect to the backend server/i)
    ).toBeInTheDocument();
  });
});
