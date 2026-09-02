import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordFormModal } from '../components/vault/PasswordFormModal';
import type { PasswordResponse } from '../types/password';

const mockOnClose = vi.fn();
const mockOnSubmit = vi.fn();

const mockInitialData: PasswordResponse = {
  id: '33333333-3333-3333-3333-333333333333',
  title: 'Existing GitLab',
  username: 'gitlab_user@passpass.dev',
  url: 'https://gitlab.com',
  password: 'DecryptedPass123!',
  notes: 'Project maintainer token',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function renderPasswordFormModal(props: Partial<React.ComponentProps<typeof PasswordFormModal>> = {}) {
  return render(
    <PasswordFormModal
      isOpen={true}
      initialData={null}
      onClose={mockOnClose}
      onSubmit={mockOnSubmit}
      {...props}
    />
  );
}

describe('PasswordFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders in Create mode with empty fields', () => {
    renderPasswordFormModal({ initialData: null });

    expect(screen.getByRole('heading', { name: /yeni şifre ekle/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/başlık/i)).toHaveValue('');
    expect(screen.getByLabelText(/kullanıcı adı \/ e-posta/i)).toHaveValue('');
    expect(screen.getByLabelText(/web sitesi url/i)).toHaveValue('');
    expect(screen.getByLabelText(/^parola/i)).toHaveValue('');
    expect(screen.getByLabelText(/şifreli notlar/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /^kaydet$/i })).toBeInTheDocument();
  });

  it('renders in Edit mode populated with initialData', () => {
    renderPasswordFormModal({ initialData: mockInitialData });

    expect(screen.getByRole('heading', { name: /şifreyi düzenle/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/başlık/i)).toHaveValue('Existing GitLab');
    expect(screen.getByLabelText(/kullanıcı adı \/ e-posta/i)).toHaveValue('gitlab_user@passpass.dev');
    expect(screen.getByLabelText(/web sitesi url/i)).toHaveValue('https://gitlab.com');
    expect(screen.getByLabelText(/^parola/i)).toHaveValue('DecryptedPass123!');
    expect(screen.getByLabelText(/şifreli notlar/i)).toHaveValue('Project maintainer token');
    expect(screen.getByRole('button', { name: /^güncelle$/i })).toBeInTheDocument();
  });

  it('validates required Title field', async () => {
    const user = userEvent.setup();
    renderPasswordFormModal();

    const submitBtn = screen.getByRole('button', { name: /^kaydet$/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/başlık alanı zorunludur/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form payload in Create mode', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValueOnce(undefined);

    renderPasswordFormModal();

    await user.type(screen.getByLabelText(/başlık/i), 'New AWS Console');
    await user.type(screen.getByLabelText(/kullanıcı adı \/ e-posta/i), 'root@aws.com');
    await user.type(screen.getByLabelText(/web sitesi url/i), 'https://aws.amazon.com');
    await user.type(screen.getByLabelText(/^parola/i), 'AwsSecretPass99!');
    await user.type(screen.getByLabelText(/şifreli notlar/i), 'Root account MFA backup');

    await user.click(screen.getByRole('button', { name: /^kaydet$/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New AWS Console',
      username: 'root@aws.com',
      url: 'https://aws.amazon.com',
      password: 'AwsSecretPass99!',
      notes: 'Root account MFA backup',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('toggles password visibility between masked and plain text', async () => {
    const user = userEvent.setup();
    renderPasswordFormModal({ initialData: mockInitialData });

    const passwordInput = screen.getByLabelText(/^parola/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /şifreyi göster/i });
    await user.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByRole('button', { name: /şifreyi gizle/i });
    await user.click(hideBtn);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles password generator panel and applies generated password', async () => {
    const user = userEvent.setup();
    renderPasswordFormModal();

    expect(screen.queryByLabelText('Şifre Oluşturucu Paneli')).not.toBeInTheDocument();

    const generateToggleBtn = screen.getByRole('button', { name: /şifre oluşturucuyu aç/i });
    await user.click(generateToggleBtn);

    expect(screen.getByLabelText('Şifre Oluşturucu Paneli')).toBeInTheDocument();

    // Click Use This Password
    const applyBtn = screen.getByRole('button', { name: /bu şifreyi kullan/i });
    await user.click(applyBtn);

    // Generator panel should close and password input should have the value
    expect(screen.queryByLabelText('Şifre Oluşturucu Paneli')).not.toBeInTheDocument();
    const passwordInput = screen.getByLabelText(/^parola/i);
    expect(passwordInput).not.toHaveValue('');
  });

  it('displays real-time password strength meter as password is typed', async () => {
    const user = userEvent.setup();
    renderPasswordFormModal();

    const passwordInput = screen.getByLabelText(/^parola/i);
    await user.type(passwordInput, 'WeakPass');

    expect(screen.getByText(/^zayıf$/i)).toBeInTheDocument();

    await user.clear(passwordInput);
    await user.type(passwordInput, 'k!9P#vL8$zQ2@mX4');

    expect(screen.getByText(/^güçlü$/i)).toBeInTheDocument();
  });
});
