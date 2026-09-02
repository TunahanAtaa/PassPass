import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordList } from '../components/vault/PasswordList';
import type { PasswordListItem } from '../types/password';

const mockItems: PasswordListItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'GitHub Account',
    username: 'developer@passpass.dev',
    url: 'https://github.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Google Workspace',
    username: 'admin@google.com',
    url: 'https://workspace.google.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockOnRetry = vi.fn();
const mockOnAddNew = vi.fn();
const mockOnView = vi.fn();
const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();
const mockOnCopyPassword = vi.fn();

function renderPasswordList(props: Partial<React.ComponentProps<typeof PasswordList>> = {}) {
  return render(
    <PasswordList
      items={mockItems}
      isLoading={false}
      error={null}
      onRetry={mockOnRetry}
      onAddNew={mockOnAddNew}
      onView={mockOnView}
      onEdit={mockOnEdit}
      onDelete={mockOnDelete}
      onCopyPassword={mockOnCopyPassword}
      {...props}
    />
  );
}

describe('PasswordList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of password cards with title, username, and url in Turkish layout', () => {
    renderPasswordList();

    expect(screen.getByText('GitHub Account')).toBeInTheDocument();
    expect(screen.getByText('developer@passpass.dev')).toBeInTheDocument();
    expect(screen.getByText('github.com')).toBeInTheDocument();

    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
    expect(screen.getByText('admin@google.com')).toBeInTheDocument();
    expect(screen.getByText('workspace.google.com')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    renderPasswordList({ isLoading: true });

    expect(screen.getByTestId('password-loading-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('GitHub Account')).not.toBeInTheDocument();
  });

  it('renders empty vault state when items list is empty', () => {
    renderPasswordList({ items: [] });

    expect(screen.getByText(/kasanız boş/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /şifreni ekle/i })).toBeInTheDocument();
  });

  it('renders error state and allows retry on failure', async () => {
    const user = userEvent.setup();
    renderPasswordList({ error: 'Veritabanı bağlantı hatası' });

    expect(screen.getByText('Veritabanı bağlantı hatası')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /yeniden dene/i });
    await user.click(retryBtn);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('filters passwords dynamically when searching', async () => {
    const user = userEvent.setup();
    renderPasswordList();

    const searchInput = screen.getByPlaceholderText(/şifrelerde ara/i);
    await user.type(searchInput, 'github');

    expect(screen.getByText('GitHub Account')).toBeInTheDocument();
    expect(screen.queryByText('Google Workspace')).not.toBeInTheDocument();
  });

  it('shows no matches message when search yields 0 items', async () => {
    const user = userEvent.setup();
    renderPasswordList();

    const searchInput = screen.getByPlaceholderText(/şifrelerde ara/i);
    await user.type(searchInput, 'NonExistentService');

    expect(screen.getByText(/için eşleşen kayıt bulunamadı/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aramayı temizle/i })).toBeInTheDocument();
  });

  it('triggers onAddNew when Şifre Ekle button is clicked', async () => {
    const user = userEvent.setup();
    renderPasswordList();

    const addBtn = screen.getByRole('button', { name: /şifre ekle/i });
    await user.click(addBtn);

    expect(mockOnAddNew).toHaveBeenCalledTimes(1);
  });

  it('triggers onView when a card is clicked', async () => {
    const user = userEvent.setup();
    renderPasswordList();

    const card = screen.getByRole('button', { name: /github account kaydının detaylarını görüntüle/i });
    await user.click(card);

    expect(mockOnView).toHaveBeenCalledWith(mockItems[0]);
  });
});
