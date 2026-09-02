/**
 * PasswordGenerator Component
 *
 * Interactive cryptographic password generator tool.
 * Provides controls for length, uppercase, lowercase, numbers, and symbols.
 * Fully localized in Turkish.
 */

import React, { useState } from 'react';
import { generatePassword, DEFAULT_GENERATOR_OPTIONS, type GeneratorOptions } from '../../utils/password-generator';

interface PasswordGeneratorProps {
  onSelectPassword?: (password: string) => void;
  onApply?: (password: string) => void;
  onClose?: () => void;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  onSelectPassword,
  onApply,
  onClose,
}) => {
  const [options, setOptions] = useState<GeneratorOptions>(() => ({
    ...DEFAULT_GENERATOR_OPTIONS,
  }));
  const [generatedPassword, setGeneratedPassword] = useState<string>(() => generatePassword(DEFAULT_GENERATOR_OPTIONS));
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerate = (currentOptions: GeneratorOptions) => {
    try {
      const pass = generatePassword(currentOptions);
      setGeneratedPassword(pass);
    } catch {
      // Keep existing if invalid options
    }
  };

  const handleOptionChange = (key: keyof GeneratorOptions, value: boolean | number) => {
    const updated = { ...options, [key]: value };
    // Ensure at least one charset is selected
    if (
      !updated.uppercase &&
      !updated.lowercase &&
      !updated.numbers &&
      !updated.symbols
    ) {
      return;
    }
    setOptions(updated);
    handleGenerate(updated);
  };

  const handleCopy = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleApplyClick = () => {
    if (generatedPassword) {
      if (onSelectPassword) onSelectPassword(generatedPassword);
      if (onApply) onApply(generatedPassword);
    }
  };

  const currentLength = options?.length ?? DEFAULT_GENERATOR_OPTIONS.length;

  return (
    <div className="generator-panel" aria-label="Şifre Oluşturucu Paneli">
      <div className="generator-header">
        <div className="generator-title-group">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/>
          </svg>
          <span className="generator-title">Şifre Oluşturucu</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Oluşturucuyu Kapat"
          >
            &times;
          </button>
        )}
      </div>

      {/* Generated Password Display */}
      <div className="generator-preview-box">
        <span className="generator-preview-text" data-testid="generated-password-preview">
          {generatedPassword}
        </span>
        <div className="generator-preview-actions">
          <button
            type="button"
            className="btn-icon-subtle"
            onClick={() => handleGenerate(options)}
            title="Yenile"
            aria-label="Yeni şifre üret"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
          </button>
          <button
            type="button"
            className="btn-icon-subtle"
            onClick={handleCopy}
            title="Kopyala"
            aria-label="Üretilen şifreyi kopyala"
          >
            {copied ? (
              <span className="copy-badge-inline">Kopyalandı!</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Length Slider */}
      <div className="generator-controls">
        <div className="generator-length-row">
          <div className="length-label-group">
            <label htmlFor="length-slider" className="control-label">
              Şifre Uzunluğu
            </label>
            <span className="length-number-badge" data-testid="length-badge">
              {currentLength} karakter
            </span>
          </div>
          <input
            id="length-slider"
            type="range"
            min={8}
            max={64}
            value={currentLength}
            onChange={(e) => handleOptionChange('length', Number(e.target.value))}
            className="generator-slider"
            aria-label="Şifre uzunluğu"
          />
        </div>

        {/* Charset Checkboxes */}
        <div className="generator-options-grid">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options?.uppercase ?? true}
              onChange={(e) => handleOptionChange('uppercase', e.target.checked)}
              aria-label="Büyük harf ekle"
            />
            <span>Büyük Harf (A-Z)</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options?.lowercase ?? true}
              onChange={(e) => handleOptionChange('lowercase', e.target.checked)}
              aria-label="Küçük harf ekle"
            />
            <span>Küçük Harf (a-z)</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options?.numbers ?? true}
              onChange={(e) => handleOptionChange('numbers', e.target.checked)}
              aria-label="Rakam ekle"
            />
            <span>Rakamlar (0-9)</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options?.symbols ?? true}
              onChange={(e) => handleOptionChange('symbols', e.target.checked)}
              aria-label="Özel karakter ekle"
            />
            <span>Özel Karakter (!@#$)</span>
          </label>
        </div>

        <button
          type="button"
          className="btn-secondary btn-apply-password"
          onClick={handleApplyClick}
          aria-label="Bu şifreyi kullan"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Bu Şifreyi Kullan</span>
        </button>
      </div>
    </div>
  );
};
