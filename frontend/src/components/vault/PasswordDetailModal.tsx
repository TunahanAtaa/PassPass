/**
 * PasswordDetailModal Component
 *
 * Displays decrypted entry details in a clean, focused modal.
 * Includes masked password reveal, clipboard copy with feedback,
 * and direct Edit/Delete actions in Turkish.
 */

import React, { useEffect, useState } from 'react';
import { passwordService } from '../../services/password.service';
import type { PasswordResponse } from '../../types/password';

interface PasswordDetailModalProps {
  isOpen: boolean;
  itemId: string | null;
  onClose: () => void;
  onEdit: (item: PasswordResponse) => void;
  onDelete: (item: PasswordResponse) => void;
}

export const PasswordDetailModal: React.FC<PasswordDetailModalProps> = ({
  isOpen,
  itemId,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [data, setData] = useState<PasswordResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'password' | 'username' | null>(null);

  useEffect(() => {
    if (isOpen && itemId) {
      setIsLoading(true);
      setError(null);
      setShowPassword(false);
      setCopiedField(null);

      Promise.resolve(passwordService.getPassword(itemId))
        .then((res) => {
          if (res) setData(res);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Şifre detayları alınamadı.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, itemId]);

  if (!isOpen) return null;

  const handleCopy = async (text: string | null, field: 'password' | 'username') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  const initial = data?.title.charAt(0).toUpperCase() || 'P';

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content modal-detail-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon">
              <span>{initial}</span>
            </div>
            <div>
              <h2 className="modal-title">{data?.title || 'Şifre Detayları'}</h2>
              {data && (
                <span className="modal-subtitle">
                  Son güncelleme: {new Date(data.updated_at).toLocaleDateString('tr-TR')}
                </span>
              )}
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

        {/* Body */}
        {isLoading ? (
          <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} data-testid="detail-loading-skeleton">
            <div className="skeleton-card" style={{ height: '50px' }} />
            <div className="skeleton-card" style={{ height: '50px' }} />
            <div className="skeleton-card" style={{ height: '80px' }} />
          </div>
        ) : error ? (
          <div className="alert-box alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            <span>{error}</span>
          </div>
        ) : data ? (
          <>
            <div className="detail-fields-list">
              {/* URL */}
              {data.url && (
                <div className="detail-row">
                  <span className="detail-label">Web Sitesi</span>
                  <div className="detail-value-wrapper">
                    <a
                      href={data.url.startsWith('http') ? data.url : `https://${data.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-url-link"
                    >
                      <span>{data.url}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {/* Username */}
              <div className="detail-row">
                <span className="detail-label">Kullanıcı Adı / E-posta</span>
                <div className="detail-value-wrapper">
                  <span className="detail-value-text">{data.username || '—'}</span>
                  {data.username && (
                    <button
                      type="button"
                      className="btn-icon-copy"
                      onClick={() => handleCopy(data.username, 'username')}
                      title="Kullanıcı adını kopyala"
                      aria-label="Kullanıcı adını kopyala"
                    >
                      {copiedField === 'username' ? (
                        <span className="copy-badge-inline">Kopyalandı!</span>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                          </svg>
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="detail-row">
                <span className="detail-label">Parola</span>
                <div className="detail-value-wrapper">
                  <span className="detail-password-value">
                    {data.password ? (showPassword ? data.password : '••••••••••••') : '—'}
                  </span>

                  {data.password && (
                    <div className="detail-password-actions">
                      <button
                        type="button"
                        className="btn-icon-subtle"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                        aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
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

                      <button
                        type="button"
                        className="btn-icon-copy"
                        onClick={() => handleCopy(data.password, 'password')}
                        title="Parolayı kopyala"
                        aria-label="Parolayı kopyala"
                      >
                        {copiedField === 'password' ? (
                          <span className="copy-badge-inline">Kopyalandı!</span>
                        ) : (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                            </svg>
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {data.notes && (
                <div className="detail-row">
                  <span className="detail-label">Şifreli Notlar</span>
                  <div className="detail-notes-box">
                    <pre>{data.notes}</pre>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="detail-timestamps">
                Oluşturulma: {new Date(data.created_at).toLocaleString('tr-TR')}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="detail-modal-footer">
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  onClose();
                  onDelete(data);
                }}
                aria-label="Kaydı Sil"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                <span>Sil</span>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Kapat
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    onEdit(data);
                  }}
                  aria-label="Kaydı Düzenle"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                  </svg>
                  <span>Düzenle</span>
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
