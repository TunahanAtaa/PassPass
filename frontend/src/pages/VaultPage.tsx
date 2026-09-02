/**
 * VaultPage Component
 *
 * 3-Column Master-Detail Dashboard for PassPass:
 * - Left Column: VaultSidebar (Logo, Categories, Security Status, User Profile & Logout)
 * - Middle Column: PasswordList (Master List with search, compact cards & selection state)
 * - Right Column: PasswordDetailPane (Permanent Detail view, inline generator & actions)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { passwordService } from '../services/password.service';
import { VaultSidebar, type VaultFilterType } from '../components/vault/VaultSidebar';
import { PasswordList } from '../components/vault/PasswordList';
import { PasswordDetailPane } from '../components/vault/PasswordDetailPane';
import { PasswordFormModal } from '../components/vault/PasswordFormModal';
import { DeleteConfirmModal } from '../components/vault/DeleteConfirmModal';
import type {
  PasswordCreateRequest,
  PasswordListItem,
  PasswordResponse,
  PasswordUpdateRequest,
} from '../types/password';

export const VaultPage: React.FC = () => {
  const [items, setItems] = useState<PasswordListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<VaultFilterType>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Form Modal state (Create / Edit)
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    initialData: PasswordResponse | null;
  }>({
    isOpen: false,
    initialData: null,
  });

  // Delete Modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: PasswordListItem | PasswordResponse | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    item: null,
    isDeleting: false,
  });

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3000);
  }, []);

  const loadPasswords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await passwordService.listPasswords();
      setItems(res.items);
      // Preserve selected item if it still exists in the updated list
      setSelectedItemId((prev) => {
        if (prev && res.items.some((i) => i.id === prev)) {
          return prev;
        }
        return null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kasa şifreleri yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  // Filter items based on active sidebar tab
  const filteredCategoryItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    if (activeFilter === 'logins') {
      return items.filter((item) => Boolean(item.username || item.url));
    }
    if (activeFilter === 'notes') {
      return items.filter((item) => !item.username && !item.url);
    }
    return items;
  }, [items, activeFilter]);

  // Counts for sidebar
  const loginsCount = useMemo(() => items.filter((i) => Boolean(i.username || i.url)).length, [items]);
  const notesCount = useMemo(() => items.filter((i) => !i.username && !i.url).length, [items]);

  // Handlers
  const handleAddNew = () => {
    setFormModal({ isOpen: true, initialData: null });
  };

  const handleView = (item: PasswordListItem) => {
    setSelectedItemId((prevId) => (prevId === item.id ? null : item.id));
  };

  const handleEdit = async (item: PasswordListItem | PasswordResponse) => {
    try {
      let fullEntry: PasswordResponse;
      if ('password' in item) {
        fullEntry = item;
      } else {
        fullEntry = await passwordService.getPassword(item.id);
      }
      setFormModal({ isOpen: true, initialData: fullEntry });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kayıt düzenleme için açılamadı', 'error');
    }
  };

  const handleDelete = (item: PasswordListItem | PasswordResponse) => {
    setDeleteModal({ isOpen: true, item, isDeleting: false });
  };

  const handleCopyPassword = async (item: PasswordListItem) => {
    try {
      const fullEntry = await passwordService.getPassword(item.id);
      if (fullEntry.password) {
        await navigator.clipboard.writeText(fullEntry.password);
        showToast(`"${item.title}" parolasını panoya kopyaladınız.`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Parola kopyalanamadı', 'error');
    }
  };

  // Form Submission
  const handleFormSubmit = async (payload: PasswordCreateRequest | PasswordUpdateRequest) => {
    if (formModal.initialData) {
      await passwordService.updatePassword(formModal.initialData.id, payload as PasswordUpdateRequest);
      showToast(`"${payload.title || formModal.initialData.title}" güncellendi.`);
    } else {
      const created = await passwordService.createPassword(payload as PasswordCreateRequest);
      showToast(`"${payload.title}" kasaya kaydedildi.`);
      setSelectedItemId(created?.id ?? null);
    }
    setFormModal({ isOpen: false, initialData: null });
    await loadPasswords();
  };

  // Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteModal.item) return;
    const deletedId = deleteModal.item.id;
    const deletedTitle = deleteModal.item.title;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await passwordService.deletePassword(deletedId);
      showToast(`"${deletedTitle}" kasadan silindi.`);
      setDeleteModal({ isOpen: false, item: null, isDeleting: false });
      if (selectedItemId === deletedId) {
        setSelectedItemId(null);
      }
      await loadPasswords();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Şifre silinemedi', 'error');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  return (
    <div className="vault-3col-dashboard">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} role="status">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {toast.type === 'error' ? (
              <>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
              </>
            ) : (
              <polyline points="20 6 9 17 4 12"/>
            )}
          </svg>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Sol Sütun: Side Nav (~18-20%) */}
      <VaultSidebar
        totalCount={items.length}
        loginsCount={loginsCount}
        notesCount={notesCount}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* 2. Orta Sütun: Master List (~32-35%) */}
      <PasswordList
        items={filteredCategoryItems}
        selectedItemId={selectedItemId}
        isLoading={isLoading}
        error={error}
        onRetry={loadPasswords}
        onAddNew={handleAddNew}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopyPassword={handleCopyPassword}
      />

      {/* 3. Sağ Sütun: Detail Panel (~45-50%) */}
      <PasswordDetailPane
        itemId={selectedItemId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClose={() => setSelectedItemId(null)}
        onAddNew={handleAddNew}
      />

      {/* Create / Edit Form Modal */}
      <PasswordFormModal
        isOpen={formModal.isOpen}
        initialData={formModal.initialData}
        onClose={() => setFormModal({ isOpen: false, initialData: null })}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        item={deleteModal.item}
        isDeleting={deleteModal.isDeleting}
        onClose={() => setDeleteModal({ isOpen: false, item: null, isDeleting: false })}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
