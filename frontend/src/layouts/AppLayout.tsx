/**
 * AppLayout Component
 *
 * Minimalist shell container for PassPass.
 * Redundant profile/logout controls have been moved to the side-nav footer.
 * Header remains clean and focused with security quick-action.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app-container">
      {/* Top Header - Clean and Minimalist */}
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="brand-logo" aria-label="PassPass Ana Sayfa">
            <img
              src="/logo.png"
              alt="PassPass"
              className="brand-logo-img"
            />
          </Link>

          <nav className="header-nav">
            {isAuthenticated ? (
              <div className="header-quick-actions">
                <button
                  type="button"
                  className="btn-header-lock"
                  onClick={logout}
                  title="Kasayı Kilitle ve Çıkış Yap"
                  aria-label="Kasayı Kilitle"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>Kasayı Kilitle</span>
                </button>
              </div>
            ) : (
              !isAuthPage && (
                <div className="guest-nav-group">
                  <Link to="/login" className="btn-secondary">
                    Giriş Yap
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Hesap Oluştur
                  </Link>
                </div>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>

      <footer className="app-footer">
        <p>PassPass Şifre Yöneticisi &bull; Argon2id + AES-256-GCM Uçtan Uca Güvenli Kasa</p>
      </footer>
    </div>
  );
};
