/**
 * PasswordStrengthBar Component
 *
 * Visual indicator showing real-time password strength with
 * color-coded progress and Turkish feedback text.
 */

import React from 'react';
import { calculatePasswordStrength } from '../../utils/password-strength';

interface PasswordStrengthBarProps {
  password?: string;
}

export const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({ password = '' }) => {
  if (!password) {
    return null;
  }

  const { level, percentage, color, feedback } = calculatePasswordStrength(password);

  return (
    <div className="strength-container" aria-label={`Şifre gücü: ${level}`}>
      <div className="strength-header">
        <span className="strength-title">Şifre Gücü:</span>
        <span className="strength-level-badge" style={{ color }}>
          {level}
        </span>
      </div>

      <div className="strength-bar-track">
        <div
          className="strength-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <span className="strength-feedback-text">{feedback}</span>
    </div>
  );
};
