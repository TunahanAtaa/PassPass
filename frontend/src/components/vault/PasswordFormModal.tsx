/**
 * PasswordFormModal Component
 *
 * Modal for creating and editing password vault entries.
 * Includes password visibility toggle, generator integration,
 * strength meter, and Turkish localized labels.
 */

import React, { useEffect, useState } from 'react';
import { PasswordGenerator } from './PasswordGenerator';
import { PasswordStrengthBar } from './PasswordStrengthBar';
import type { PasswordCreateRequest, PasswordResponse, PasswordUpdateRequest } from '../../types/password';

interface PasswordFormModalProps {
  isOpen: boolean;
  initialData?: PasswordResponse | null;
  onClose: () => void;
  onSubmit: (payload: PasswordCreateRequest | PasswordUpdateRequest) => Promise<void>;
}

export const PasswordFormModal: React.FC<PasswordFormModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSubmit,
}) => {
  const isEditMode = Boolean(initialData);

  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setUsername(initialData.username || '');
        setPassword(initialData.password || '');
        setUrl(initialData.url || '');
        setNotes(initialData.notes || '');
      } else {
        setTitle('');
        setUsername('');
        setPassword('');
        setUrl('');
        setNotes('');
      }
      setShowPassword(false);
      setShowGenerator(false);
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Başlık alanı zorunludur.');
      return;
    }

    if (!isEditMode && !password) {
      setError('Parola alanı zorunludur.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        const payload: PasswordUpdateRequest = {
          title: title.trim(),
          username: username.trim() || null,
          url: url.trim() || null,
          notes: notes || null,
        };
        if (password) {
          payload.password = password;
        }
        await onSubmit(payload);
      } else {
        const payload: PasswordCreateRequest = {
          title: title.trim(),
          password,
          username: username.trim() || undefined,
          url: url.trim() || undefined,
          notes: notes || undefined,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyGeneratedPassword = (newPass: string) => {
    setPassword(newPass);
    setShowGenerator(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h2 className="modal-title">
                {isEditMode ? 'Şifreyi Düzenle' : 'Yeni Şifre Ekle'}
              </h2>
              <span className="modal-subtitle">
                {isEditMode ? 'Kayıt bilgilerini güncelleyin' : 'Kasaya yeni bir şifre kaydedin'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Kapat"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="alert-box alert-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Başlık <span className="field-required">*</span>
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="Örn: GitHub, Google, Netflix"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Username */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Kullanıcı Adı / E-posta
            </label>
            <input
              id="username"
              type="text"
              className="form-input form-input-mono"
              placeholder="kullanici@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          {/* URL */}
          <div className="form-group">
            <label htmlFor="url" className="form-label">
              Web Sitesi URL
            </label>
            <input
              id="url"
              type="text"
              className="form-input form-input-mono"
              placeholder="https://github.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Password with Generator trigger */}
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password" className="form-label">
                Parola {!isEditMode && <span className="field-required">*</span>}
              </label>
              <button
                type="button"
                className="btn-text-action"
                onClick={() => setShowGenerator(!showGenerator)}
                aria-label="Şifre Oluşturucuyu Aç"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/>
                </svg>
                <span>{showGenerator ? 'Oluşturucuyu Kapat' : 'Şifre Üret'}</span>
              </button>
            </div>

            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input form-input-mono"
                placeholder={isEditMode ? 'Değiştirmek istemiyorsanız boş bırakın' : '••••••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                required={!isEditMode}
              />
              {password && (
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                      <line x1="2" y1="2" x2="22" y2="22"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              )}
            </div>

            {/* Live Strength Meter */}
            <PasswordStrengthBar password={password} />

            {/* Embedded Generator Tool */}
            {showGenerator && (
              <PasswordGenerator onSelectPassword={handleApplyGeneratedPassword} />
            )}
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Şifreli Notlar
            </label>
            <textarea
              id="notes"
              className="form-input form-textarea"
              placeholder="Kurtarma kodları, ek güvenlik yanıtları..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              aria-label={isEditMode ? 'Güncelle' : 'Kaydet'}
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Güncelle' : 'Kaydet'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
