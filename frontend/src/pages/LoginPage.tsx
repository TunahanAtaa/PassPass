/**
 * LoginPage Component
 *
 * User authentication screen with email and master password.
 * Fully localized in Turkish.
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api-client';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success message from registration redirect
  const successMessage = (location.state as { message?: string })?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('E-posta adresi zorunludur');
      return;
    }
    if (!password) {
      setError('Parola alanı zorunludur');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Geçersiz e-posta veya parola. Lütfen bilgilerinizi kontrol edin.');
        } else {
          setError(err.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <img
              src="/logo.png"
              alt="PassPass"
              style={{ height: '60px', width: 'auto', display: 'block' }}
            />
          </div>
          <h1 className="auth-title">PassPass'e Giriş Yap</h1>
          <p className="auth-subtitle">Kasanızı açmak için ana parolanızı girin</p>
        </div>

        {successMessage && (
          <div className="alert-box alert-success" role="status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="alert-box alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-posta Adresi
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="adiniz@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Ana Parola
            </label>
            <input
              id="password"
              type="password"
              className="form-input form-input-mono"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" />
                <span>Doğrulanıyor...</span>
              </>
            ) : (
              <span>Giriş Yap</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Hesabınız yok mu?{' '}
            <Link to="/register" className="auth-link">
              Hesap Oluştur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
