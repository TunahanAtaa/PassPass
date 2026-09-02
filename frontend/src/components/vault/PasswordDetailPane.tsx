/**
 * PasswordDetailPane Component
 *
 * Right column (Detail Panel) for the 3-column Master-Detail Dashboard.
 * Displays large prominent title, mop-key emblem, last updated date,
 * decrypted data fields (Web Sitesi, Kullanıcı Adı, Parola with reveal & copy),
 * integrated inline Password Generator, Encrypted Notes, and action buttons (Düzenle, Sil, Kapat).
 */

import React, { useEffect, useState } from 'react';
import { passwordService } from '../../services/password.service';
import type { PasswordResponse } from '../../types/password';

interface PasswordDetailPaneProps {
  itemId: string | null;
  onEdit?: (item: PasswordResponse) => void;
  onDelete?: (item: PasswordResponse) => void;
  onClose?: () => void;
  onAddNew?: () => void;
}

export const PasswordDetailPane: React.FC<PasswordDetailPaneProps> = ({
  itemId,
  onClose,
  onAddNew,
}) => {
  const [data, setData] = useState<PasswordResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<'password' | 'username' | null>(null);

  useEffect(() => {
    if (itemId) {
      setIsLoading(true);
      setError(null);
      setShowPassword(false);
      setCopiedField(null);

      passwordService
        .getPassword(itemId)
        .then((res) => {
          setData(res);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Şifre detayları yüklenemedi.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setData(null);
    }
  }, [itemId]);

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

  if (!itemId) {
    return (
      <section className="vault-detail-pane" aria-label="Şifre Detay Paneli">
        <div className="detail-pane-empty">
          <div className="detail-pane-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Kayıt Seçilmedi
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: 1.5 }}>
            Şifre detaylarını ve gizli notları görüntülemek için soldaki listeden bir kayıt seçin.
          </p>
          {onAddNew && (
            <button
              type="button"
              className="btn-primary"
              onClick={onAddNew}
              style={{ marginTop: '1rem' }}
              aria-label="Yeni Şifre Ekle"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Yeni Şifre Ekle</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  const initial = data?.title.charAt(0).toUpperCase() || 'P';
  const formattedDate = data
    ? new Date(data.updated_at).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <section className="vault-detail-pane" aria-label="Şifre Detay Paneli">
      {isLoading ? (
        <div style={{ padding: '2rem' }} data-testid="detail-loading-skeleton">
          <div className="skeleton-card" style={{ height: '70px', marginBottom: '1.25rem' }} />
          <div className="skeleton-card" style={{ height: '65px', marginBottom: '1rem' }} />
          <div className="skeleton-card" style={{ height: '65px', marginBottom: '1rem' }} />
          <div className="skeleton-card" style={{ height: '100px' }} />
        </div>
      ) : error ? (
        <div style={{ padding: '1.5rem' }}>
          <div className="alert-box alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            <span>{error}</span>
          </div>
        </div>
      ) : data ? (
        <div className="detail-pane-wrapper">
          {/* Large Prominent Header */}
          <div className="detail-pane-header">
            <div className="detail-header-title-group">
              <div className="detail-header-avatar">
                <span>{initial}</span>
              </div>
              <div>
                <h2 className="detail-header-title">
                  Şifre Detayı: <span className="detail-title-highlight">{data.title}</span>
                </h2>
                <div className="detail-header-meta-row">
                  <span className="detail-header-meta">
                    Son güncelleme: {formattedDate}
                  </span>
                  <span className="detail-meta-badge">AES-256 Korumalı</span>
                </div>
              </div>
            </div>

            <div className="detail-header-actions">
              {onClose && (
                <button
                  type="button"
                  className="btn-icon-subtle"
                  onClick={onClose}
                  aria-label="Detayı Kapat"
                  title="Detayı Kapat"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Main Data Fields */}
          <div className="detail-pane-content">
            {/* Website URL */}
            <div className="detail-data-card">
              <span className="data-card-label">Web Sitesi</span>
              <div className="data-card-value-row">
                {data.url ? (
                  <a
                    href={data.url.startsWith('http') ? data.url : `https://${data.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="data-card-link"
                  >
                    <span>{data.url}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                ) : (
                  <span className="data-card-empty-value">Belirtilmedi</span>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="detail-data-card">
              <span className="data-card-label">Kullanıcı Adı / E-posta</span>
              <div className="data-card-value-row">
                <span className="data-card-value-mono">
                  {data.username || 'Belirtilmedi'}
                </span>
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

            {/* Password Field */}
            <div className="detail-data-card">
              <span className="data-card-label">Parola</span>

              <div className="data-card-value-row">
                <span className={showPassword ? 'data-card-value-mono' : 'data-card-value-masked'}>
                  {data.password ? (showPassword ? data.password : '••••••••••••') : '—'}
                </span>

                {data.password && (
                  <div className="data-card-actions-group">
                    <button
                      type="button"
                      className="btn-icon-subtle"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Parolayı Gizle' : 'Parolayı Gör'}
                      aria-label={showPassword ? 'Parolayı Gizle' : 'Parolayı Gör'}
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

            {/* Encrypted Notes Box */}
            <div className="detail-data-card">
              <span className="data-card-label">Şifreli Notlar</span>
              <div className="detail-notes-box">
                {data.notes ? (
                  <pre>{data.notes}</pre>
                ) : (
                  <span className="data-card-empty-value">Kayıtlı not bulunmuyor.</span>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            {onClose && (
              <div className="detail-bottom-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  aria-label="Kapat"
                  style={{ minWidth: '90px' }}
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};
