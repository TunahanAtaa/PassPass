import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordGenerator } from '../components/vault/PasswordGenerator';

const mockOnApply = vi.fn();
const mockOnClose = vi.fn();

function renderPasswordGenerator(props: Partial<React.ComponentProps<typeof PasswordGenerator>> = {}) {
  return render(
    <PasswordGenerator
      onApply={mockOnApply}
      onClose={mockOnClose}
      {...props}
    />
  );
}

describe('PasswordGenerator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders generator panel with preview and controls in Turkish', () => {
    renderPasswordGenerator();

    expect(screen.getByText('Şifre Oluşturucu')).toBeInTheDocument();
    expect(screen.getByTestId('generated-password-preview')).toBeInTheDocument();
    expect(screen.getByLabelText(/şifre uzunluğu/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/büyük harf ekle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/küçük harf ekle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rakam ekle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/özel karakter ekle/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bu şifreyi kullan/i })).toBeInTheDocument();
  });

  it('updates length badge and generated password when slider is adjusted', async () => {
    renderPasswordGenerator();

    const slider = screen.getByLabelText(/şifre uzunluğu/i);
    fireEvent.change(slider, { target: { value: '28' } });

    expect(screen.getByTestId('length-badge')).toHaveTextContent('28 karakter');
    const preview = screen.getByTestId('generated-password-preview');
    expect(preview.textContent).toHaveLength(28);
  });

  it('regenerates password when regenerate button is clicked', async () => {
    const user = userEvent.setup();
    renderPasswordGenerator();

    const initialPassword = screen.getByTestId('generated-password-preview').textContent;
    const regenerateBtn = screen.getByRole('button', { name: /yeni şifre üret/i });
    await user.click(regenerateBtn);

    const newPassword = screen.getByTestId('generated-password-preview').textContent;
    expect(newPassword).not.toBe(initialPassword);
  });

  it('calls onApply with generated password when Use This Password button is clicked', async () => {
    const user = userEvent.setup();
    renderPasswordGenerator();

    const generatedPassword = screen.getByTestId('generated-password-preview').textContent;
    const applyBtn = screen.getByRole('button', { name: /bu şifreyi kullan/i });
    await user.click(applyBtn);

    expect(mockOnApply).toHaveBeenCalledWith(generatedPassword);
  });

  it('copies generated password to clipboard', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    renderPasswordGenerator();

    const generatedPassword = screen.getByTestId('generated-password-preview').textContent;
    const copyBtn = screen.getByRole('button', { name: /üretilen şifreyi kopyala/i });
    await user.click(copyBtn);

    expect(writeSpy).toHaveBeenCalledWith(generatedPassword);
    expect(await screen.findByText('Kopyalandı!')).toBeInTheDocument();
  });

  it('calls onClose when close icon is clicked', async () => {
    const user = userEvent.setup();
    renderPasswordGenerator();

    const closeBtn = screen.getByRole('button', { name: /oluşturucuyu kapat/i });
    await user.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
