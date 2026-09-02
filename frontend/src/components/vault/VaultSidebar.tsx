/**
 * VaultSidebar Component
 *
 * Left column (Side Nav) for the 3-column Master-Detail Dashboard.
 * Displays PassPass brand logo, category filters with count badges,
 * AES-256 vault security status, user profile avatar with email,
 * and a clean logout action.
 */

import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export type VaultFilterType = 'all' | 'logins' | 'notes';

interface VaultSidebarProps {
  totalCount: number;
  loginsCount?: number;
  notesCount?: number;
  activeFilter: VaultFilterType;
  onSelectFilter: (filter: VaultFilterType) => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({
  totalCount,
  activeFilter,
  onSelectFilter,
  userEmail,
  onLogout,
}) => {
  const authContext = useContext(AuthContext);
  const currentUserEmail = userEmail || authContext?.user?.email;
  const handleLogout = onLogout || authContext?.logout;
  const userInitial = currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'T';

  return (
    <aside className="vault-sidebar-pane" aria-label="Kasa menüsü">
      {/* Navigation Categories */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">KASA</h3>

        <button
          type="button"
          className={`sidebar-nav-item ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onSelectFilter('all')}
          aria-label="Tüm şifreleri listele"
        >
          <span className="sidebar-nav-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="7" height="7" x="3" y="3" rx="1"/>
              <rect width="7" height="7" x="14" y="3" rx="1"/>
              <rect width="7" height="7" x="14" y="14" rx="1"/>
              <rect width="7" height="7" x="3" y="14" rx="1"/>
            </svg>
            <span>Tüm Şifreler</span>
          </span>
          <span className="sidebar-count-badge">{totalCount}</span>
        </button>
      </div>

      {/* Footer Area */}
      <div className="sidebar-footer">
        {/* Security Status Indicator */}
        <div className="sidebar-status-indicator">
          <span className="status-dot" />
          <span>AES-256 Kasa Aktif</span>
        </div>

        {/* Clean Single Profile & Logout Row */}
        {currentUserEmail && (
          <div className="sidebar-profile-card">
            <div className="sidebar-profile-user">
              <div className="user-avatar-mini" title={currentUserEmail}>
                {userInitial}
              </div>
              <span className="user-email-text" title={currentUserEmail}>
                {currentUserEmail}
              </span>
            </div>

            {handleLogout && (
              <button
                type="button"
                className="btn-sidebar-logout"
                onClick={handleLogout}
                aria-label="Çıkış Yap"
                title="Çıkış Yap"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Çıkış Yap</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
