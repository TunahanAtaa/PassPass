/**
 * PasswordCard Component
 *
 * Compact Master-List card optimized for 3-column vertical density.
 * Displays site avatar, title, username, short domain, and top-right mini action icons.
 * Plaintext password is never exposed in list view.
 */

import React, { useState } from 'react';
import type { PasswordListItem } from '../../types/password';

interface PasswordCardProps {
  item: PasswordListItem;
  isSelected?: boolean;
  onView: (item: PasswordListItem) => void;
  onEdit: (item: PasswordListItem) => void;
  onDelete: (item: PasswordListItem) => void;
  onCopyPassword?: (item: PasswordListItem) => Promise<void>;
}

export const PasswordCard: React.FC<PasswordCardProps> = ({
  item,
  isSelected = false,
  onView,
  onEdit,
  onDelete,
  onCopyPassword,
}) => {
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);

  const initial = item.title.charAt(0).toUpperCase() || 'P';

  const handleQuickCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCopyPassword || isCopying) return;
    setIsCopying(true);
    try {
      await onCopyPassword(item);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      // ignore
    } finally {
      setIsCopying(false);
    }
  };

  const cleanUrl = item.url
    ? item.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    : null;

  return (
    <div
      className={`password-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onView(item)}
      role="button"
      tabIndex={0}
      aria-label={`${item.title} kaydının detaylarını görüntüle`}
    >
      <div className="password-card-header">
        <div className="password-card-avatar">
          <span>{initial}</span>
        </div>

        <div className="password-card-title-group">
          <h3 className="password-card-title">{item.title}</h3>
          {cleanUrl && <span className="password-card-url">{cleanUrl}</span>}
        </div>

        <div className="password-card-mini-actions">
          {onCopyPassword && (
            <button
              type="button"
              className="btn-icon-subtle btn-card-quick-copy"
              onClick={handleQuickCopy}
              disabled={isCopying}
              title="Parolayı kopyala"
              aria-label={`${item.title} parolasını kopyala`}
            >
              {copiedPassword ? (
                <span className="copy-badge-mini">✓</span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
              )}
            </button>
          )}

          <button
            type="button"
            className="btn-icon-subtle"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            title="Düzenle"
            aria-label={`${item.title} kaydını düzenle`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>

          <button
            type="button"
            className="btn-icon-subtle btn-card-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            title="Sil"
            aria-label={`${item.title} kaydını sil`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="password-card-body">
        {item.username ? (
          <span className="card-username-text" title={item.username}>
            {item.username}
          </span>
        ) : (
          <span className="card-no-username">Kullanıcı adı yok</span>
        )}
      </div>
    </div>
  );
};
