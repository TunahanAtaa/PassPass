import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VaultPage } from '../pages/VaultPage';
import { passwordService } from '../services/password.service';
import type { PasswordListItem, PasswordResponse } from '../types/password';

vi.mock('../services/password.service', () => ({
  passwordService: {
    listPasswords: vi.fn(),
    getPassword: vi.fn(),
    createPassword: vi.fn(),
    updatePassword: vi.fn(),
    deletePassword: vi.fn(),
  },
}));

const mockItems: PasswordListItem[] = [
  {
    id: 'vault-item-1',
    title: 'Twitter / X',
    username: 'tweeter@passpass.dev',
    url: 'https://x.com',
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  },
  {
    id: 'vault-item-2',
    title: 'Netflix Account',
    username: 'watcher@passpass.dev',
    url: 'https://netflix.com',
    created_at: '2026-08-21T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  },
];

const mockDetailedEntry: PasswordResponse = {
  id: 'vault-item-1',
  title: 'Twitter / X',
  username: 'tweeter@passpass.dev',
  url: 'https://x.com',
  password: 'DecryptedTwitterPass99!',
  notes: 'Backup codes on phone',
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-28T10:00:00Z',
};

describe('VaultPage Component Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(passwordService.getPassword).mockResolvedValue(mockDetailedEntry);
  });

  it('loads and displays password vault entries on mount in Turkish layout', async () => {
    vi.mocked(passwordService.listPasswords).mockResolvedValueOnce({
      items: mockItems,
      count: 2,
    });

    render(<VaultPage />);

    expect(await screen.findByText('Twitter / X')).toBeInTheDocument();
    expect(screen.getByText('Netflix Account')).toBeInTheDocument();
    expect(screen.getByText('Tüm Şifreler')).toBeInTheDocument();
    expect(screen.getByText('Kasanda 2 kayıt bulunuyor')).toBeInTheDocument();
  });

  it('opens create modal, submits new entry, and reloads list', async () => {
    const user = userEvent.setup();
    vi.mocked(passwordService.listPasswords)
      .mockResolvedValueOnce({ items: [], count: 0 })
      .mockResolvedValueOnce({ items: [mockItems[0]], count: 1 });
    vi.mocked(passwordService.createPassword).mockResolvedValueOnce(mockDetailedEntry);

    render(<VaultPage />);

    // Click İlk Şifreni Ekle button in empty state
    const addBtn = await screen.findByRole('button', { name: /şifreni ekle/i });
    await user.click(addBtn);

    expect(screen.getByRole('heading', { name: /yeni şifre ekle/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/başlık/i), 'Twitter / X');
    await user.type(screen.getByLabelText(/kullanıcı adı \/ e-posta/i), 'tweeter@passpass.dev');
    await user.type(screen.getByLabelText(/^parola/i), 'DecryptedTwitterPass99!');

    await user.click(screen.getByRole('button', { name: /^kaydet$/i }));

    await waitFor(() => {
      expect(passwordService.createPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Twitter / X',
          username: 'tweeter@passpass.dev',
          password: 'DecryptedTwitterPass99!',
        })
      );
      expect(screen.getByText('Twitter / X')).toBeInTheDocument();
    });
  });

  it('opens and closes detail pane when entry card is clicked and re-clicked', async () => {
    vi.mocked(passwordService.listPasswords).mockResolvedValueOnce({
      items: mockItems,
      count: 2,
    });
    vi.mocked(passwordService.getPassword).mockResolvedValue(mockDetailedEntry);

    render(<VaultPage />);

    const itemCard = await screen.findByRole('button', { name: /twitter \/ x kaydının detaylarını görüntüle/i });
    fireEvent.click(itemCard);

    expect(await screen.findByText('Backup codes on phone')).toBeInTheDocument();
    expect(screen.getByText('••••••••••••')).toBeInTheDocument();

    // Clicking the same card again should close/toggle off detail pane
    fireEvent.click(itemCard);
    expect(await screen.findByText('Kayıt Seçilmedi')).toBeInTheDocument();
  });

  it('opens delete confirmation and deletes entry', async () => {
    const user = userEvent.setup();
    vi.mocked(passwordService.listPasswords)
      .mockResolvedValueOnce({ items: [mockItems[0]], count: 1 })
      .mockResolvedValueOnce({ items: [], count: 0 });
    vi.mocked(passwordService.deletePassword).mockResolvedValueOnce(undefined);

    render(<VaultPage />);

    await screen.findByText('Twitter / X');

    const deleteBtn = screen.getByRole('button', { name: /twitter \/ x kaydını sil/i });
    await user.click(deleteBtn);

    expect(screen.getByRole('heading', { name: /şifreyi sil/i })).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /kalıcı olarak sil/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(passwordService.deletePassword).toHaveBeenCalledWith('vault-item-1');
      expect(screen.getByText(/kasanız boş/i)).toBeInTheDocument();
    });
  });
});
