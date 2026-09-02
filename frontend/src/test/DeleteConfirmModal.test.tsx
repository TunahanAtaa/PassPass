import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteConfirmModal } from '../components/vault/DeleteConfirmModal';
import type { PasswordListItem } from '../types/password';

const mockItem: PasswordListItem = {
  id: '55555555-5555-5555-5555-555555555555',
  title: 'Spotify Premium',
  username: 'music_lover@passpass.dev',
  url: 'https://spotify.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

function renderDeleteConfirmModal(props: Partial<React.ComponentProps<typeof DeleteConfirmModal>> = {}) {
  return render(
    <DeleteConfirmModal
      isOpen={true}
      item={mockItem}
      isDeleting={false}
      onClose={mockOnClose}
      onConfirm={mockOnConfirm}
      {...props}
    />
  );
}

describe('DeleteConfirmModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders confirmation message including the item title', () => {
    renderDeleteConfirmModal();

    expect(screen.getByRole('heading', { name: /şifreyi sil/i })).toBeInTheDocument();
    expect(screen.getByText(/spotify premium/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kalıcı olarak sil/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'İptal' })).toBeInTheDocument();
  });

  it('calls onConfirm when Delete button is clicked', async () => {
    const user = userEvent.setup();
    mockOnConfirm.mockResolvedValueOnce(undefined);

    renderDeleteConfirmModal();

    const deleteBtn = screen.getByRole('button', { name: /kalıcı olarak sil/i });
    await user.click(deleteBtn);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderDeleteConfirmModal();

    const cancelBtn = screen.getByRole('button', { name: 'İptal' });
    await user.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
