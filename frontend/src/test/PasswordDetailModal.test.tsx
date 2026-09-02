import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordDetailModal } from '../components/vault/PasswordDetailModal';
import { passwordService } from '../services/password.service';
import type { PasswordResponse } from '../types/password';

vi.mock('../services/password.service', () => ({
  passwordService: {
    getPassword: vi.fn(),
  },
}));

const mockEntry: PasswordResponse = {
  id: '44444444-4444-4444-4444-444444444444',
  title: 'DigitalOcean Cloud',
  username: 'admin@digitalocean.com',
  url: 'https://cloud.digitalocean.com',
  password: 'MyDecryptedCloudPass!77',
  notes: 'API tokens stored here',
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-28T12:00:00Z',
};

const mockOnClose = vi.fn();
const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();

function renderPasswordDetailModal(props: Partial<React.ComponentProps<typeof PasswordDetailModal>> = {}) {
  return render(
    <PasswordDetailModal
      isOpen={true}
      itemId="44444444-4444-4444-4444-444444444444"
      onClose={mockOnClose}
      onEdit={mockOnEdit}
      onDelete={mockOnDelete}
      {...props}
    />
  );
}

describe('PasswordDetailModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches decrypted entry details on open and displays them', async () => {
    vi.mocked(passwordService.getPassword).mockResolvedValueOnce(mockEntry);

    renderPasswordDetailModal();

    expect(screen.getByTestId('detail-loading-skeleton')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'DigitalOcean Cloud' })).toBeInTheDocument();
    expect(screen.getByText('admin@digitalocean.com')).toBeInTheDocument();
    expect(screen.getByText('https://cloud.digitalocean.com')).toBeInTheDocument();
    expect(screen.getByText('API tokens stored here')).toBeInTheDocument();
  });

  it('masks password by default and reveals plaintext when show button is toggled', async () => {
    const user = userEvent.setup();
    vi.mocked(passwordService.getPassword).mockResolvedValueOnce(mockEntry);

    renderPasswordDetailModal();

    expect(await screen.findByText('••••••••••••')).toBeInTheDocument();
    expect(screen.queryByText('MyDecryptedCloudPass!77')).not.toBeInTheDocument();

    const showBtn = screen.getByRole('button', { name: /parolayı göster/i });
    await user.click(showBtn);

    expect(screen.getByText('MyDecryptedCloudPass!77')).toBeInTheDocument();
    expect(screen.queryByText('••••••••••••')).not.toBeInTheDocument();

    const hideBtn = screen.getByRole('button', { name: /parolayı gizle/i });
    await user.click(hideBtn);

    expect(screen.getByText('••••••••••••')).toBeInTheDocument();
  });

  it('copies password to clipboard and provides feedback', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    vi.mocked(passwordService.getPassword).mockResolvedValueOnce(mockEntry);

    renderPasswordDetailModal();

    await screen.findByText('DigitalOcean Cloud');

    const copyBtn = screen.getByRole('button', { name: /parolayı kopyala/i });
    await user.click(copyBtn);

    expect(writeSpy).toHaveBeenCalledWith('MyDecryptedCloudPass!77');
    expect(await screen.findByText('Kopyalandı!')).toBeInTheDocument();
  });

  it('copies username to clipboard and provides feedback', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    vi.mocked(passwordService.getPassword).mockResolvedValueOnce(mockEntry);

    renderPasswordDetailModal();

    await screen.findByText('DigitalOcean Cloud');

    const copyUsernameBtn = screen.getByRole('button', { name: /kullanıcı adını kopyala/i });
    await user.click(copyUsernameBtn);

    expect(writeSpy).toHaveBeenCalledWith('admin@digitalocean.com');
    expect(await screen.findByText('Kopyalandı!')).toBeInTheDocument();
  });

  it('triggers onEdit and closes modal', async () => {
    const user = userEvent.setup();
    vi.mocked(passwordService.getPassword).mockResolvedValueOnce(mockEntry);

    renderPasswordDetailModal();

    const editBtn = await screen.findByRole('button', { name: /kaydı düzenle/i });
    await user.click(editBtn);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnEdit).toHaveBeenCalledWith(mockEntry);
  });

  it('triggers onDelete and closes modal', async () => {
    const user = userEvent.setup();
    vi.mocked(passwordService.getPassword).mockResolvedValueOnce(mockEntry);

    renderPasswordDetailModal();

    const deleteBtn = await screen.findByRole('button', { name: /kaydı sil/i });
    await user.click(deleteBtn);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnDelete).toHaveBeenCalledWith(mockEntry);
  });
});
