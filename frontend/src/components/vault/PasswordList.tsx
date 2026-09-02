/**
 * PasswordList Component
 *
 * Middle column (Master List) for the 3-column Master-Detail Dashboard.
 * Displays search bar, total count, "+ Şifre Ekle" CTA, and scrollable compact cards.
 */

import React, { useMemo, useState } from 'react';
import { PasswordCard } from './PasswordCard';
import type { PasswordListItem } from '../../types/password';

interface PasswordListProps {
  items: PasswordListItem[];
  selectedItemId?: string | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddNew: () => void;
  onView: (item: PasswordListItem) => void;
  onEdit: (item: PasswordListItem) => void;
  onDelete: (item: PasswordListItem) => void;
  onCopyPassword?: (item: PasswordListItem) => Promise<void>;
}

export const PasswordList: React.FC<PasswordListProps> = ({
  items,
  selectedItemId,
  isLoading,
  error,
  onRetry,
  onAddNew,
  onView,
  onEdit,
  onDelete,
  onCopyPassword,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.username && item.username.toLowerCase().includes(query)) ||
        (item.url && item.url.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  return (
    <div className="vault-master-pane" aria-label="Şifre Kasası">
      {/* Top Header */}
      <div className="vault-top-header">
        <div>
          <h1 className="vault-title">Şifreler</h1>
          <p className="vault-subtitle">
            {items.length > 0
              ? `Kasanda ${items.length} kayıt bulunuyor`
              : 'Kasanda kayıt bulunmuyor'}
          </p>
        </div>

        <button
          type="button"
          className="btn-primary btn-vault-add"
          onClick={onAddNew}
          aria-label="Şifre Ekle"
          title="Yeni şifre ekle"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Şifre Ekle</span>
        </button>
      </div>

      {/* Search Controls Bar */}
      <div className="vault-controls-bar">
        <div className="vault-search-wrapper">
          <svg className="vault-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            className="form-input vault-search-input"
            placeholder="Şifrelerde ara (başlık, kullanıcı adı, site)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Şifrelerde ara"
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Aramayı sıfırla"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Master List Cards */}
      <div className="vault-master-scroll-area">
        {isLoading ? (
          <div className="password-master-list" data-testid="password-loading-skeleton">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="skeleton-card" />
            ))}
          </div>
        ) : error ? (
          <div className="alert-box alert-error" role="alert" style={{ margin: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <span>{error}</span>
              <button type="button" className="btn-secondary" onClick={onRetry} style={{ alignSelf: 'flex-start' }}>
                Yeniden Dene
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-vault-state">
            <div className="empty-vault-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2 className="empty-vault-title">Kasanız boş</h2>
            <p className="empty-vault-subtitle">
              Şifrelerinizi ve gizli notlarınızı AES-256-GCM ile uçtan uca şifreleyerek güvenle saklayın.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={onAddNew}
              style={{ marginTop: '0.5rem' }}
              aria-label="İlk Şifreni Ekle"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>İlk Şifreni Ekle</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-vault-state">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              "{searchQuery}" için eşleşen kayıt bulunamadı.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSearchQuery('')}
              aria-label="Aramayı Temizle"
            >
              Aramayı Temizle
            </button>
          </div>
        ) : (
          <div className="password-master-list">
            {filteredItems.map((item) => (
              <PasswordCard
                key={item.id}
                item={item}
                isSelected={selectedItemId === item.id}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopyPassword={onCopyPassword}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
