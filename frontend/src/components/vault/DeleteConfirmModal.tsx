/**
 * DeleteConfirmModal Component
 *
 * Minimalist danger confirmation dialog before permanently deleting an entry.
 * Fully localized in Turkish.
 */

import React from 'react';
import type { PasswordListItem, PasswordResponse } from '../../types/password';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: PasswordListItem | PasswordResponse | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content modal-confirm-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="modal-confirm-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </div>

        <h2 className="modal-confirm-title">Şifreyi Sil</h2>
        <p className="modal-confirm-text">
          <strong>"{item.title}"</strong> kaydını kasanızdan kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>

        <div className="modal-confirm-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            İptal
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-label="Kalıcı Olarak Sil"
          >
            {isDeleting ? (
              <>
                <span className="btn-spinner" />
                <span>Siliniyor...</span>
              </>
            ) : (
              <span>Kalıcı Olarak Sil</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
