/**
 * RegisterPage Component
 *
 * User registration screen with password requirement checklist
 * and auto-login setup. Fully localized in Turkish.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api-client';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation helpers
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const validateForm = (): string | null => {
    if (!email.trim()) {
      return 'E-posta adresi zorunludur';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Lütfen geçerli bir e-posta adresi girin';
    }
    if (!hasMinLength) {
      return 'Parola en az 8 karakter uzunluğunda olmalıdır';
    }
    if (!hasLetter) {
      return 'Parola en az bir harf içermelidir';
    }
    if (!hasDigit) {
      return 'Parola en az bir rakam içermelidir';
    }
    if (password !== confirmPassword) {
      return 'Parolalar eşleşmiyor';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Register user
      await register({ email: email.trim(), password });

      // 2. Automatically log in to establish vault session
      await login({ email: email.trim(), password });

      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Bu e-posta adresiyle kayıtlı bir hesap zaten var. Lütfen giriş yapın.');
        } else {
          setError(err.message || 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.');
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
          <h1 className="auth-title">PassPass Hesabı Oluştur</h1>
          <p className="auth-subtitle">Şifrelerinizi güvence altına almak için hesap açın</p>
        </div>

        {error && (
          <div className="alert-box alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
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
              autoComplete="new-password"
              required
            />
          </div>

          {/* Password Requirements Checklist */}
          {password.length > 0 && (
            <div className="password-checklist">
              <div className={`checklist-item ${hasMinLength ? 'valid' : ''}`}>
                <span className="checklist-icon">{hasMinLength ? '✓' : '•'}</span>
                <span>En az 8 karakter</span>
              </div>
              <div className={`checklist-item ${hasLetter ? 'valid' : ''}`}>
                <span className="checklist-icon">{hasLetter ? '✓' : '•'}</span>
                <span>En az bir harf</span>
              </div>
              <div className={`checklist-item ${hasDigit ? 'valid' : ''}`}>
                <span className="checklist-icon">{hasDigit ? '✓' : '•'}</span>
                <span>En az bir rakam</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Parolayı Tekrarla
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input form-input-mono"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              required
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <span className="form-hint error">Parolalar eşleşmiyor</span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" />
                <span>Hesap Oluşturuluyor...</span>
              </>
            ) : (
              <span>Hesap Oluştur</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Zaten bir hesabınız var mı?{' '}
            <Link to="/login" className="auth-link">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
