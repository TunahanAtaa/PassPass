import React from 'react';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { formatTimestamp } from '../utils/formatters';
import { API_BASE_URL } from '../lib/api-client';

export const HealthStatus: React.FC = () => {
  const { data, isLoading, error, lastChecked, refetch } = useHealthCheck();

  const isHealthy = !isLoading && !error && data?.status === 'ok';
  const isDbConnected = data?.database === 'connected';

  return (
    <div className="card-grid">
      {/* Backend API Health Card */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
                <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
                <line x1="6" x2="6.01" y1="6" y2="6"/>
                <line x1="6" x2="6.01" y1="18" y2="18"/>
              </svg>
            </div>
            <h3 className="card-title">Backend API</h3>
          </div>
          <div className={`status-pill ${isLoading ? 'loading' : isHealthy ? 'healthy' : 'error'}`}>
            <span className="status-dot" />
            {isLoading ? 'Checking...' : isHealthy ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="metric-list">
          <div className="metric-item">
            <span className="metric-label">Status</span>
            <span className="metric-value">{isLoading ? '...' : data?.status || 'unreachable'}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Endpoint</span>
            <span className="metric-value">{API_BASE_URL}/health</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Last Checked</span>
            <span className="metric-value">{lastChecked ? formatTimestamp(lastChecked) : '—'}</span>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', color: 'var(--status-error-text)', fontSize: '0.8125rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* PostgreSQL Database Health Card */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
                <path d="M3 12A9 3 0 0 0 21 12"/>
              </svg>
            </div>
            <h3 className="card-title">PostgreSQL</h3>
          </div>
          <div className={`status-pill ${isLoading ? 'loading' : isDbConnected ? 'healthy' : 'error'}`}>
            <span className="status-dot" />
            {isLoading ? 'Checking...' : isDbConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="metric-list">
          <div className="metric-item">
            <span className="metric-label">Engine</span>
            <span className="metric-value">SQLAlchemy 2.0 (psycopg3)</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Container</span>
            <span className="metric-value">postgres:16-alpine</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Alembic</span>
            <span className="metric-value">Configured & Ready</span>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={() => refetch()} 
            disabled={isLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>
      </div>
    </div>
  );
};
