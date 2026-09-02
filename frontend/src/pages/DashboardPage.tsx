/**
 * DashboardPage Component
 *
 * Authenticated main application screen for Day 7.
 * Displays user identity, active security status, and session details.
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { HealthStatus } from '../components/HealthStatus';

export const DashboardPage: React.FC = () => {
  const { user, vaultToken, logout } = useAuth();

  return (
    <div className="dashboard-container">
      {/* Welcome Hero */}
      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-avatar">
            <span>{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div>
            <h1 className="dashboard-title">Welcome back!</h1>
            <p className="dashboard-email">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="btn-secondary btn-logout-hero">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Sign Out</span>
        </button>
      </section>

      {/* Security & Account State Cards */}
      <div className="card-grid">
        {/* Security Overview */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h2 className="card-title">Security State</h2>
            </div>
            <span className="status-pill healthy">
              <span className="status-dot" />
              Authenticated
            </span>
          </div>

          <div className="metric-list">
            <div className="metric-item">
              <span className="metric-label">Authentication Token (JWT)</span>
              <span className="metric-value status-success-text">Active (Bearer)</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Vault Session Token</span>
              <span className="metric-value status-success-text">
                {vaultToken ? 'Unlocked (In-Memory KDF)' : 'Locked'}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Encryption Architecture</span>
              <span className="metric-value">Argon2id + AES-256-GCM</span>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h2 className="card-title">User Account</h2>
            </div>
            <span className={`status-pill ${user?.is_active ? 'healthy' : 'error'}`}>
              <span className="status-dot" />
              {user?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="metric-list">
            <div className="metric-item">
              <span className="metric-label">User ID</span>
              <span className="metric-value" style={{ fontSize: '0.75rem' }}>{user?.id}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Email Verified</span>
              <span className="metric-value">{user?.is_email_verified ? 'Yes' : 'Pending'}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Member Since</span>
              <span className="metric-value">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Vault Placeholder Card */}
      <div className="glass-card vault-teaser-card" style={{ marginBottom: '2rem' }}>
        <div className="vault-teaser-content">
          <div className="vault-teaser-badge">Day 8 Preview</div>
          <h3 className="card-title" style={{ fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            Password Vault Management
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: '1.6' }}>
            Your authentication session is active and securely authenticated with the FastAPI backend.
            Full Password Vault UI (creating, viewing, editing, and deleting AES-256 encrypted passwords)
            will be unlocked in the upcoming development day.
          </p>
        </div>
      </div>

      {/* Backend Infrastructure Health */}
      <HealthStatus />
    </div>
  );
};
