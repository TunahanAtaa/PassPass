import React from 'react';
import { HealthStatus } from '../components/HealthStatus';

export const HomePage: React.FC = () => {
  return (
    <div>
      <section className="hero-section">
        <h1 className="hero-title">PassPass Architecture Skeleton</h1>
        <p className="hero-description">
          A secure, extensible foundation for personal password management.
          Built with React, FastAPI, SQLAlchemy 2.0, Alembic, and PostgreSQL.
        </p>
      </section>

      {/* Real-time Health Status */}
      <HealthStatus />

      {/* Layer Overview */}
      <div className="glass-card" style={{ marginTop: '2rem' }}>
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>Active Tech Stack</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          The core skeleton provides a clean separation of concerns ready for future cryptography, authentication, and vault services.
        </p>

        <div className="stack-tags">
          <span className="tag">React 19 + TypeScript</span>
          <span className="tag">Vite 7</span>
          <span className="tag">FastAPI (Python 3.14)</span>
          <span className="tag">SQLAlchemy 2.0</span>
          <span className="tag">Psycopg 3</span>
          <span className="tag">Alembic Migration Engine</span>
          <span className="tag">PostgreSQL 16 (Docker Compose)</span>
        </div>
      </div>
    </div>
  );
};
