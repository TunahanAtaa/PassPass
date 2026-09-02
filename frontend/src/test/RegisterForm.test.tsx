import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RegisterPage } from '../pages/RegisterPage';
import { AuthContext } from '../context/AuthContext';
import { ApiError } from '../lib/api-client';
import type { AuthContextType, UserResponse } from '../types/auth';

const mockRegister = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();
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

function renderRegisterPage(authContextOverrides: Partial<AuthContextType> = {}) {
  const contextValue: AuthContextType = {
    ...defaultAuthContextValue,
    ...authContextOverrides,
  };

  return render(
    <AuthContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>Dashboard Home</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders register form elements correctly in Turkish', () => {
    renderRegisterPage();

    expect(screen.getByRole('heading', { name: /passpass hesabı oluştur/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-posta adresi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^ana parola/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/parolayı tekrarla/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^hesap oluştur$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /giriş yap/i })).toBeInTheDocument();
  });

  it('validates required email field', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByRole('button', { name: /^hesap oluştur$/i }));
    expect(await screen.findByText(/e-posta adresi zorunludur/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates invalid email format', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'invalid-email');
    await user.type(screen.getByLabelText(/^ana parola/i), 'ValidPass1');
    await user.type(screen.getByLabelText(/parolayı tekrarla/i), 'ValidPass1');
    await user.click(screen.getByRole('button', { name: /^hesap oluştur$/i }));

    expect(await screen.findByText(/lütfen geçerli bir e-posta adresi girin/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates password min length requirement', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'valid@example.com');
    await user.type(screen.getByLabelText(/^ana parola/i), 'Sh0rt');
    await user.type(screen.getByLabelText(/parolayı tekrarla/i), 'Sh0rt');
    await user.click(screen.getByRole('button', { name: /^hesap oluştur$/i }));

    expect(await screen.findByText(/parola en az 8 karakter uzunluğunda olmalıdır/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates password must contain at least one digit', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'valid@example.com');
    await user.type(screen.getByLabelText(/^ana parola/i), 'NoDigitsHere');
    await user.type(screen.getByLabelText(/parolayı tekrarla/i), 'NoDigitsHere');
    await user.click(screen.getByRole('button', { name: /^hesap oluştur$/i }));

    expect(await screen.findByText(/parola en az bir rakam içermelidir/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates password must contain at least one letter', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'valid@example.com');
    await user.type(screen.getByLabelText(/^ana parola/i), '12345678');
    await user.type(screen.getByLabelText(/parolayı tekrarla/i), '12345678');
    await user.click(screen.getByRole('button', { name: /^hesap oluştur$/i }));

    expect(await screen.findByText(/parola en az bir harf içermelidir/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates password confirmation mismatch', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'valid@example.com');
    await user.type(screen.getByLabelText(/^ana parola/i), 'Password123');
    await user.type(screen.getByLabelText(/parolayı tekrarla/i), 'Different123');
    await user.click(screen.getByRole('button', { name: /^hesap oluştur$/i }));

    const errorElements = await screen.findAllByText(/parolalar eşleşmiyor/i);
    expect(errorElements.length).toBeGreaterThan(0);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('successfully registers and auto-logs in user', async () => {
    const user = userEvent.setup();
    const mockUserResponse: UserResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'newuser@passpass.dev',
      is_active: true,
      is_email_verified: false,
      created_at: new Date().toISOString(),
    };

    mockRegister.mockResolvedValueOnce(mockUserResponse);
    mockLogin.mockResolvedValueOnce(undefined);

    renderRegisterPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'newuser@passpass.dev');
    await user.type(screen.getByLabelText(/^ana parola/i), 'ValidPass1');
    await user.type(screen.getByLabelText(/parolayı tekrarla/i), 'ValidPass1');
    await user.click(screen.getByRole('button', { name: /^hesap oluştur$/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'newuser@passpass.dev',
        password: 'ValidPass1',
      });
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'newuser@passpass.dev',
        password: 'ValidPass1',
      });
      expect(screen.getByText('Dashboard Home')).toBeInTheDocument();
    });
  });

  it('handles 409 Conflict when user already exists', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(new ApiError('Email already registered', 409));

    renderRegisterPage();

    await user.type(screen.getByLabelText(/e-posta adresi/i), 'existing@passpass.dev');
    await user.type(screen.getByLabelText(/^ana parola/i), 'ValidPass1');
    await user.type(screen.getByLabelText(/parolayı tekrarla/i), 'ValidPass1');
    await user.click(screen.getByRole('button', { name: /^hesap oluştur$/i }));

    expect(
      await screen.findByText(/bu e-posta adresiyle kayıtlı bir hesap zaten var/i)
    ).toBeInTheDocument();
  });
});
